/**
 * 라멘 가게가 아닌 레코드 분석 스크립트
 *
 * 다층 필터링 로직으로 DB에서 라멘집이 아닌 레코드를 식별하고 리포트를 생성합니다.
 *
 * Usage:
 *   pnpm analyze:non-ramen                          # 분석만 수행
 *   pnpm analyze:non-ramen --delete --dry-run       # 삭제 대상 미리보기
 *   pnpm analyze:non-ramen --delete --confirm       # 실제 삭제 (확신도 90% 이상)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  EXCLUDE_KEYWORDS,
  INCLUDE_KEYWORDS,
  SUSPICIOUS_PATTERNS,
  SuspiciousPattern,
} from './config';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

type AnalysisCategory = 'confirmed_non_ramen' | 'suspicious' | 'likely_ramen';

interface AnalysisResult {
  category: AnalysisCategory;
  confidence: number; // 0-100
  reasons: string[];
  shop: Shop;
}

interface AnalysisReport {
  totalShops: number;
  confirmedNonRamen: AnalysisResult[];
  suspicious: AnalysisResult[];
  likelyRamen: AnalysisResult[];
  timestamp: string;
}

class NonRamenAnalyzer {
  /**
   * Layer 1: 제외 키워드 체크 (Blacklist)
   */
  private checkBlacklistKeywords(
    shopName: string
  ): { match: boolean; keywords: string[] } {
    const matched: string[] = [];
    const lowerName = shopName.toLowerCase();

    for (const keyword of EXCLUDE_KEYWORDS) {
      if (lowerName.includes(keyword.toLowerCase())) {
        matched.push(keyword);
      }
    }

    return {
      match: matched.length > 0,
      keywords: matched,
    };
  }

  /**
   * Layer 2: 포함 키워드 체크 (Whitelist)
   */
  private checkMissingRamenKeywords(shopName: string): boolean {
    const lowerName = shopName.toLowerCase();

    for (const keyword of INCLUDE_KEYWORDS) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return false; // 라멘 키워드 있음
      }
    }

    return true; // 라멘 키워드 없음
  }

  /**
   * Layer 3: 의심 패턴 체크
   */
  private checkSuspiciousPatterns(
    shopName: string
  ): { suspicious: boolean; patterns: SuspiciousPattern[] } {
    const matched: SuspiciousPattern[] = [];
    const lowerName = shopName.toLowerCase();

    for (const pattern of SUSPICIOUS_PATTERNS) {
      const hasExclude = lowerName.includes(pattern.exclude.toLowerCase());
      const hasInclude = lowerName.includes(pattern.include.toLowerCase());

      if (hasExclude && hasInclude) {
        matched.push(pattern);
      }
    }

    return {
      suspicious: matched.length > 0,
      patterns: matched,
    };
  }

  /**
   * 종합 분석
   */
  analyzeShop(shop: Shop): AnalysisResult {
    const reasons: string[] = [];
    let category: AnalysisCategory;
    let confidence: number;

    // Layer 1-3: 이름 기반 분석
    const blacklist = this.checkBlacklistKeywords(shop.name);
    const missingRamen = this.checkMissingRamenKeywords(shop.name);
    const suspiciousCheck = this.checkSuspiciousPatterns(shop.name);

    // Case 1: 제외 키워드 있음 + 라멘 키워드 없음 → 확신도 높음 (90-100%)
    if (blacklist.match && missingRamen) {
      category = 'confirmed_non_ramen';
      confidence = 95;
      reasons.push(`제외 키워드 포함: ${blacklist.keywords.join(', ')}`);
      reasons.push('라멘 관련 키워드 없음');
    }
    // Case 2: 제외 키워드 있음 + 라멘 키워드 있음 → 의심 (60-80%)
    else if (blacklist.match && !missingRamen) {
      category = 'suspicious';
      confidence = 70;
      reasons.push(`제외 키워드 포함: ${blacklist.keywords.join(', ')}`);
      reasons.push('라멘 키워드도 포함됨 (수동 검증 필요)');

      if (suspiciousCheck.suspicious) {
        suspiciousCheck.patterns.forEach((p) => {
          reasons.push(`의심 패턴: ${p.description}`);
        });
      }
    }
    // Case 3: 제외 키워드 없음 + 라멘 키워드 없음 → 의심 (50-70%)
    else if (!blacklist.match && missingRamen) {
      category = 'suspicious';
      confidence = 60;
      reasons.push('라멘 관련 키워드 없음');
      reasons.push('제외 키워드도 없음 (애매함)');
    }
    // Case 4: 제외 키워드 없음 + 라멘 키워드 있음 → 라멘집 가능성 높음 (80-100%)
    else {
      category = 'likely_ramen';
      confidence = 90;
      reasons.push('라멘 관련 키워드 포함');
      reasons.push('제외 키워드 없음');
    }

    return {
      category,
      confidence,
      reasons,
      shop,
    };
  }

  /**
   * 여러 가게 일괄 분석
   */
  analyzeShops(shops: Shop[]): AnalysisReport {
    console.log(`\n🔍 ${shops.length}개 레코드 분석 시작...\n`);

    const results = shops.map((shop) => this.analyzeShop(shop));

    const confirmedNonRamen = results.filter(
      (r) => r.category === 'confirmed_non_ramen'
    );
    const suspicious = results.filter((r) => r.category === 'suspicious');
    const likelyRamen = results.filter((r) => r.category === 'likely_ramen');

    console.log('✅ 분석 완료\n');

    return {
      totalShops: shops.length,
      confirmedNonRamen,
      suspicious,
      likelyRamen,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Console 리포트 생성
   */
  printReport(report: AnalysisReport): void {
    const confirmedCount = report.confirmedNonRamen.length;
    const suspiciousCount = report.suspicious.length;
    const likelyRamenCount = report.likelyRamen.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 라멘 가게 분석 리포트');
    console.log('='.repeat(60));
    console.log('');
    console.log(`총 레코드: ${report.totalShops}개`);
    console.log('');
    console.log(
      `✅ 라멘 가게 (확신): ${likelyRamenCount}개 (${((likelyRamenCount / report.totalShops) * 100).toFixed(1)}%)`
    );
    console.log(
      `⚠️  의심 레코드: ${suspiciousCount}개 (${((suspiciousCount / report.totalShops) * 100).toFixed(1)}%)`
    );
    console.log(
      `❌ 라멘 아님 (확신): ${confirmedCount}개 (${((confirmedCount / report.totalShops) * 100).toFixed(1)}%)`
    );
    console.log('');

    // 라멘 아님 (확신도 90% 이상)
    if (confirmedCount > 0) {
      console.log('━'.repeat(60));
      console.log('❌ 라멘 아님 (확신도 90% 이상):');
      console.log('');

      const top20 = report.confirmedNonRamen.slice(0, 20);
      top20.forEach((result, idx) => {
        console.log(
          `${idx + 1}. [${result.confidence}%] ${result.shop.name}`
        );
        console.log(`   ID: ${result.shop.id}`);
        console.log(`   주소: ${result.shop.address}`);
        console.log(`   이유:`);
        result.reasons.forEach((reason) => {
          console.log(`     - ${reason}`);
        });
        console.log('');
      });

      if (confirmedCount > 20) {
        console.log(`... 외 ${confirmedCount - 20}개\n`);
      }
    }

    // 의심 레코드
    if (suspiciousCount > 0) {
      console.log('━'.repeat(60));
      console.log('⚠️  의심 레코드 (수동 검증 필요):');
      console.log('');

      const top10 = report.suspicious.slice(0, 10);
      top10.forEach((result, idx) => {
        console.log(
          `${idx + 1}. [${result.confidence}%] ${result.shop.name}`
        );
        console.log(`   ID: ${result.shop.id}`);
        console.log(`   주소: ${result.shop.address}`);
        console.log(`   이유:`);
        result.reasons.forEach((reason) => {
          console.log(`     - ${reason}`);
        });
        console.log('');
      });

      if (suspiciousCount > 10) {
        console.log(`... 외 ${suspiciousCount - 10}개\n`);
      }
    }

    console.log('='.repeat(60));
  }

  /**
   * JSON 리포트 저장
   */
  saveJsonReport(report: AnalysisReport): string {
    const reportsDir = path.join(process.cwd(), 'reports');

    // reports 디렉토리 생성 (없으면)
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `non-ramen-analysis-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`\n📄 상세 리포트 저장: ${filepath}\n`);

    return filepath;
  }

  /**
   * CSV 리포트 저장
   */
  saveCsvReport(report: AnalysisReport): string {
    const reportsDir = path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `non-ramen-analysis-${timestamp}.csv`;
    const filepath = path.join(reportsDir, filename);

    // CSV 헤더
    const header = 'Category,Confidence,ID,Name,Address,Reasons\n';

    // CSV 행
    const allResults = [
      ...report.confirmedNonRamen,
      ...report.suspicious,
      ...report.likelyRamen,
    ];

    const rows = allResults
      .map((result) => {
        const reasons = result.reasons.join('; ');
        return `${result.category},${result.confidence},${result.shop.id},"${result.shop.name}","${result.shop.address}","${reasons}"`;
      })
      .join('\n');

    fs.writeFileSync(filepath, header + rows, 'utf-8');

    console.log(`📄 CSV 리포트 저장: ${filepath}\n`);

    return filepath;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  const args = process.argv.slice(2);
  const deleteMode = args.includes('--delete');
  const dryRun = args.includes('--dry-run');
  const confirm = args.includes('--confirm');

  console.log('\n' + '='.repeat(60));
  console.log('🍜 라멘 가게 분석 도구');
  console.log('='.repeat(60));
  console.log('');

  if (deleteMode && !dryRun && !confirm) {
    console.error('❌ --delete 사용 시 --dry-run 또는 --confirm 필요합니다.\n');
    console.error('안전한 사용법:');
    console.error('  1. pnpm analyze:non-ramen --delete --dry-run  (미리보기)');
    console.error('  2. pnpm analyze:non-ramen --delete --confirm   (실제 삭제)\n');
    process.exit(1);
  }

  // Supabase 연결
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      '❌ Supabase URL과 Anon Key가 필요합니다. .env 파일을 확인하세요.\n'
    );
    process.exit(1);
  }

  const client = createClient(url, key);

  // 모든 shops 조회
  console.log('🔍 데이터베이스에서 레코드 조회 중...\n');

  const { data: shops, error } = await client
    .from('shops')
    .select('id, name, address, lat, lng')
    .order('name');

  if (error) {
    console.error('❌ DB 조회 실패:', error.message);
    process.exit(1);
  }

  if (!shops || shops.length === 0) {
    console.log('✅ 레코드가 없습니다.\n');
    process.exit(0);
  }

  console.log(`✅ ${shops.length}개 레코드 로드 완료\n`);

  // 분석 수행
  const analyzer = new NonRamenAnalyzer();
  const report = analyzer.analyzeShops(shops);

  // 리포트 출력
  analyzer.printReport(report);

  // 리포트 저장
  analyzer.saveJsonReport(report);
  analyzer.saveCsvReport(report);

  // 삭제 모드
  if (deleteMode) {
    console.log('━'.repeat(60));
    console.log('🗑️  삭제 모드');
    console.log('━'.repeat(60));
    console.log('');

    const toDelete = report.confirmedNonRamen.filter((r) => r.confidence >= 90);

    console.log(`삭제 대상: ${toDelete.length}개 (확신도 90% 이상)\n`);

    if (toDelete.length === 0) {
      console.log('✅ 삭제할 레코드가 없습니다.\n');
      process.exit(0);
    }

    if (dryRun) {
      console.log('⚠️  [DRY RUN 모드] 실제 삭제 없이 미리보기만 수행합니다.\n');
      console.log('삭제될 레코드 (샘플 10개):');
      toDelete.slice(0, 10).forEach((result, idx) => {
        console.log(`  [${idx + 1}] ${result.shop.name}`);
        console.log(`      ID: ${result.shop.id}`);
        console.log(`      이유: ${result.reasons.join(', ')}`);
        console.log('');
      });

      if (toDelete.length > 10) {
        console.log(`  ... 외 ${toDelete.length - 10}개\n`);
      }

      console.log('✅ [DRY RUN] 미리보기 완료\n');
    } else if (confirm) {
      console.log('⚠️  실제 DB에서 삭제를 시작합니다...\n');

      let successCount = 0;
      let failedCount = 0;

      // 배치 삭제 (50개씩)
      const batchSize = 50;
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const ids = batch.map((r) => r.shop.id);

        const { error: deleteError } = await client
          .from('shops')
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.log(
            `  ❌ 배치 ${Math.floor(i / batchSize) + 1} 삭제 실패: ${deleteError.message}`
          );
          failedCount += batch.length;
        } else {
          console.log(
            `  ✅ 배치 ${Math.floor(i / batchSize) + 1} 삭제 완료: ${batch.length}개`
          );
          successCount += batch.length;
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 삭제 완료 요약');
      console.log('='.repeat(60));
      console.log(`✅ 성공: ${successCount}개`);
      console.log(`❌ 실패: ${failedCount}개`);
      console.log(`📋 총 처리: ${toDelete.length}개`);
      console.log('='.repeat(60));
      console.log('\n✨ 작업 완료!\n');
    }
  }

  console.log('✅ 분석 완료!\n');
}

// 실행
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
