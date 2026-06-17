/**
 * 통합 크롤링 스크립트
 *
 * Kakao API + 웹 스크래핑 + 데이터 검증 + DB 저장을 통합 실행합니다.
 *
 * Usage:
 *   pnpm crawl:shops              # 기본 실행
 *   pnpm crawl:shops:strict       # 엄격 모드 (라멘 필터링 강화)
 *   pnpm crawl:shops:dry-run      # DB 저장 없이 테스트
 */

import * as dotenv from 'dotenv';
import { KakaoApiClient, KakaoPlace } from './kakao-api';
import { KakaoDetailScraper, PlaceDetail } from './kakao-detail-scraper';
import { DataValidator } from './data-validator';
import { SupabaseImporter } from './db-importer';
import {
  EXCLUDE_KEYWORDS,
  INCLUDE_KEYWORDS,
  loadCrawlConfig,
  printConfig,
  generateSearchKeywords,
} from './config';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

interface CrawlOptions {
  strict: boolean;
  dryRun: boolean;
  enableScraping: boolean; // Instagram 스크래핑 활성화 여부
}

type FilterReason =
  | 'categoryRamen'
  | 'categoryNonRamen'
  | 'nameStrongRamen'
  | 'nameNonRamen'
  | 'ambiguous';

interface FilterDecision {
  keep: boolean;
  reason: FilterReason;
}

const CATEGORY_RAMEN_KEYWORDS = [
  '라멘',
  'ramen',
  '일본라면',
  '일본라멘',
] as const;

const JAPANESE_RAMEN_CATEGORY_KEYWORD = '일본식라면';

const CATEGORY_NON_RAMEN_KEYWORDS = [
  '돈가스',
  '돈까스',
  '카츠',
  '카레',
  '우동',
  '초밥',
  '스시',
  '덮밥',
  '이자카야',
  '튀김',
  '야키니쿠',
  '샤브샤브',
  '텐동',
  '오야코동',
] as const;

class CrawlOrchestrator {
  private kakaoClient: KakaoApiClient;
  private scraper: KakaoDetailScraper;
  private validator: DataValidator;
  private importer: SupabaseImporter;
  private options: CrawlOptions;

  constructor(options: CrawlOptions) {
    const config = loadCrawlConfig();
    printConfig(config);

    this.kakaoClient = new KakaoApiClient(
      config.kakaoApiKey,
      config.requestDelayMs
    );

    this.scraper = new KakaoDetailScraper(1000); // 1초 지연
    this.validator = new DataValidator();
    this.importer = new SupabaseImporter(
      config.supabaseUrl,
      config.supabaseKey
    );

    this.options = options;

    console.log('🚀 크롤링 오케스트레이터 초기화 완료\n');
  }

  /**
   * 전체 크롤링 파이프라인 실행
   */
  async run(): Promise<void> {
    console.log('=' .repeat(60));
    console.log('🍜 Ramap 라멘집 크롤링 시작');
    console.log('=' .repeat(60));
    console.log('');

    const startTime = Date.now();

    try {
      // Step 1: Kakao API로 기본 정보 수집
      console.log('📍 Step 1: Kakao API 검색\n');
      const keywords = generateSearchKeywords();
      console.log(`검색 키워드: ${keywords.length}개`);
      console.log(`키워드 목록: ${keywords.join(', ')}\n`);

      const places = await this.kakaoClient.searchMultipleKeywords(
        keywords,
        3 // 키워드당 최대 3페이지
      );

      if (places.length === 0) {
        console.log('⚠️  검색 결과가 없습니다. 종료합니다.');
        return;
      }

      // Step 2: 필터링
      console.log('🔍 Step 2: 필터링\n');
      const filtered = this.applyRamenCandidateFilter(places);

      console.log(`필터링 후: ${filtered.length}개 (${places.length - filtered.length}개 제거)\n`);

      // Step 3: 상세 페이지 스크래핑 (Instagram URL)
      let placeDetails: Map<string, PlaceDetail> | undefined;

      if (this.options.enableScraping) {
        console.log('🕷️  Step 3: 상세 페이지 스크래핑 (Instagram URL)\n');

        const placeUrls = filtered.map(p => p.place_url);
        const details = await this.scraper.scrapeBatch(placeUrls);

        placeDetails = new Map(
          details.map(detail => [detail.placeId, detail])
        );

        const instagramCount = details.filter(
          d => d.socialLinks.instagram
        ).length;
        console.log(
          `Instagram URL 발견: ${instagramCount}개 / ${details.length}개\n`
        );
      } else {
        console.log('ℹ️  Step 3: 상세 페이지 스크래핑 생략됨\n');
      }

      // Step 4: 데이터 검증 및 변환
      console.log('✅ Step 4: 데이터 검증 및 변환\n');
      const validationResult = this.validator.validateAndTransform(
        filtered,
        placeDetails
      );

      if (validationResult.valid.length === 0) {
        console.log('⚠️  유효한 데이터가 없습니다. 종료합니다.');
        return;
      }

      // 중복 제거
      const unique = this.validator.deduplicate(validationResult.valid);

      // Step 5: Supabase에 저장
      console.log('💾 Step 5: Supabase에 저장\n');

      if (!this.options.dryRun) {
        // DB 연결 테스트
        const connected = await this.importer.testConnection();
        if (!connected) {
          throw new Error('Supabase 연결 실패');
        }
      }

      const importResult = await this.importer.importShops(unique, {
        upsert: true,
        batchSize: 50,
        dryRun: this.options.dryRun,
      });

      // 결과 요약
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(60));
      console.log('📊 크롤링 완료 요약');
      console.log('='.repeat(60));
      console.log(`⏱️  소요 시간: ${duration}초`);
      console.log(`🔍 Kakao API 검색 결과: ${places.length}개`);
      console.log(`🔎 필터링 후: ${filtered.length}개`);
      console.log(`✅ 유효한 데이터: ${unique.length}개`);

      if (this.options.enableScraping) {
        const instagramCount = unique.filter(s => s.instagramUrl).length;
        console.log(
          `📸 Instagram URL 보유: ${instagramCount}개 (${((instagramCount / unique.length) * 100).toFixed(1)}%)`
        );
      }

      console.log(`💾 DB 저장 성공: ${importResult.success}개`);
      console.log(`❌ DB 저장 실패: ${importResult.failed}개`);

      if (this.options.dryRun) {
        console.log(`\n⚠️  [DRY RUN 모드] 실제 DB에 저장되지 않았습니다.`);
      }

      console.log('='.repeat(60));
      console.log('✅ 크롤링 완료!\n');
    } catch (error) {
      console.error('\n❌ 크롤링 중 오류 발생:');
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * 라멘 후보 필터링
   *
   * Layer 0 정책과 맞춰 카테고리를 먼저 판정하고, 카테고리 판단이
   * 어려운 경우에만 이름 기반 include/exclude 키워드를 사용합니다.
   */
  private applyRamenCandidateFilter(places: KakaoPlace[]): KakaoPlace[] {
    const stats: Record<FilterReason, number> = {
      categoryRamen: 0,
      categoryNonRamen: 0,
      nameStrongRamen: 0,
      nameNonRamen: 0,
      ambiguous: 0,
    };

    const filtered = places.filter(place => {
      const decision = this.evaluateRamenCandidate(place);
      stats[decision.reason] += 1;

      return decision.keep;
    });

    console.log(
      `카테고리 확정 라멘: ${stats.categoryRamen}개, 이름 기반 라멘 후보: ${stats.nameStrongRamen}개`
    );
    console.log(
      `제거: 카테고리 비라멘 ${stats.categoryNonRamen}개, 이름 비라멘 ${stats.nameNonRamen}개, 애매함 ${stats.ambiguous}개`
    );

    return filtered;
  }

  private evaluateRamenCandidate(place: KakaoPlace): FilterDecision {
    const category = this.normalizeText(place.category_name);

    // Kakao API의 일본식라면 카테고리는 이름/비라멘 키워드보다 항상 우선합니다.
    if (category.includes(JAPANESE_RAMEN_CATEGORY_KEYWORD)) {
      return { keep: true, reason: 'categoryRamen' };
    }

    if (this.includesAny(category, CATEGORY_RAMEN_KEYWORDS)) {
      return { keep: true, reason: 'categoryRamen' };
    }

    if (this.includesAny(category, CATEGORY_NON_RAMEN_KEYWORDS)) {
      return { keep: false, reason: 'categoryNonRamen' };
    }

    const name = this.normalizeText(place.place_name);
    const hasStrongRamenName = this.includesAny(name, INCLUDE_KEYWORDS);
    const hasNonRamenName = this.includesAny(name, EXCLUDE_KEYWORDS);

    if (hasStrongRamenName) {
      if (this.options.strict && hasNonRamenName) {
        return { keep: false, reason: 'nameNonRamen' };
      }

      return { keep: true, reason: 'nameStrongRamen' };
    }

    if (hasNonRamenName) {
      return { keep: false, reason: 'nameNonRamen' };
    }

    return { keep: false, reason: 'ambiguous' };
  }

  private normalizeText(value?: string): string {
    return (value || '').toLowerCase();
  }

  private includesAny(text: string, keywords: readonly string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }
}

// CLI 실행
async function main() {
  const args = process.argv.slice(2);

  const options: CrawlOptions = {
    strict: args.includes('--strict'),
    dryRun: args.includes('--dry-run'),
    enableScraping: !args.includes('--no-scraping'), // 기본적으로 활성화
  };

  console.log('⚙️  실행 옵션:');
  console.log(`   - 엄격 모드: ${options.strict ? 'ON' : 'OFF'}`);
  console.log(`   - Dry Run: ${options.dryRun ? 'ON' : 'OFF'}`);
  console.log(
    `   - Instagram 스크래핑: ${options.enableScraping ? 'ON' : 'OFF'}\n`
  );

  const orchestrator = new CrawlOrchestrator(options);
  await orchestrator.run();
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}
