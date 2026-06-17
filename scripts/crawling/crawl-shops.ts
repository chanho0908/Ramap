#!/usr/bin/env node

/**
 * 라멘집 크롤링 메인 스크립트
 *
 * Kakao Places API를 사용하여 전국 라멘집 정보를 수집하고 Supabase에 저장합니다.
 *
 * 사용법:
 *   pnpm crawl:shops
 *   pnpm crawl:shops --strict
 *   pnpm crawl:shops --dry-run
 */

import 'dotenv/config';
import { KakaoApiClient } from './kakao-api';
import {
  validateAndTransformPlaces,
  printValidationSummary,
} from './data-validator';
import { SupabaseImporter } from './db-importer';
import {
  loadCrawlConfig,
  printConfig,
  generateSearchKeywords,
} from './config';

/**
 * CLI 옵션 파싱
 */
interface CliOptions {
  strictMode: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);

  return {
    strictMode: args.includes('--strict'),
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * 도움말 출력
 */
function printHelp(): void {
  console.log(`
📖 라멘집 크롤링 스크립트 사용법

사용법:
  pnpm crawl:shops [옵션]

옵션:
  --strict      엄격 모드: 라멘 관련 키워드가 포함된 장소만 수집
  --dry-run     테스트 모드: 데이터베이스에 저장하지 않고 검증만 수행
  --help, -h    이 도움말 출력

환경 변수 (.env.local):
  KAKAO_REST_API_KEY          (필수) Kakao REST API 키
  NEXT_PUBLIC_SUPABASE_URL    (필수) Supabase 프로젝트 URL
  SUPABASE_SERVICE_ROLE_KEY   (필수) Supabase Service Role 키
  KAKAO_REQUEST_DELAY_MS      (선택) API 요청 간 지연 (기본값: 500)
  MAX_PAGES_PER_KEYWORD       (선택) 키워드당 최대 페이지 수 (기본값: 3)
  BATCH_SIZE                  (선택) 배치 삽입 크기 (기본값: 50)
  UPSERT_MODE                 (선택) 중복 시 업데이트 (기본값: false)

예시:
  # 기본 실행
  pnpm crawl:shops

  # 엄격 모드로 실행
  pnpm crawl:shops --strict

  # 테스트 실행 (DB 저장 안 함)
  pnpm crawl:shops --dry-run
  `);
}

/**
 * 메인 크롤링 함수
 */
async function main(): Promise<void> {
  console.log('🍜 라멘집 크롤링 시작\n');
  console.log('=' . repeat(60));

  // 1. CLI 옵션 파싱
  const cliOptions = parseCliOptions();

  if (cliOptions.help) {
    printHelp();
    process.exit(0);
  }

  try {
    // 2. 설정 로드
    const config = loadCrawlConfig();

    // CLI 옵션이 있으면 설정 오버라이드
    if (cliOptions.strictMode) {
      config.strictMode = true;
    }

    printConfig(config);

    if (cliOptions.dryRun) {
      console.log('⚠️  DRY-RUN 모드: 데이터베이스에 저장하지 않습니다.\n');
    }

    // 3. Kakao API 클라이언트 초기화
    console.log('🔧 Kakao API 클라이언트 초기화...');
    const kakaoClient = new KakaoApiClient(
      config.kakaoApiKey,
      config.requestDelayMs
    );
    console.log('✅ 초기화 완료\n');

    // 4. Supabase 연결 테스트
    if (!cliOptions.dryRun) {
      console.log('🔧 Supabase 연결 테스트...');
      const importer = new SupabaseImporter(
        config.supabaseUrl,
        config.supabaseKey
      );
      const isConnected = await importer.testConnection();

      if (!isConnected) {
        throw new Error('Supabase 연결 실패');
      }

      const currentCount = await importer.getShopCount();
      console.log(`   현재 DB에 ${currentCount}개의 Shop이 저장되어 있습니다.\n`);
    }

    // 5. 검색 키워드 생성
    const keywords = generateSearchKeywords();
    console.log(`🔍 총 ${keywords.length}개의 키워드로 검색 시작...\n`);
    console.log('키워드:', keywords.slice(0, 5).join(', '), '...\n');

    // 6. 크롤링 실행
    console.log('=' . repeat(60));
    console.log('📡 크롤링 시작\n');

    const startTime = Date.now();

    const rawPlaces = await kakaoClient.searchMultipleKeywords(
      keywords,
      config.maxPagesPerKeyword
    );

    const crawlTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  크롤링 소요 시간: ${crawlTime}초\n`);

    // 7. 데이터 검증 및 변환
    console.log('=' . repeat(60));
    console.log('✅ 데이터 검증 및 변환\n');

    const validationResult = validateAndTransformPlaces(
      rawPlaces,
      config.strictMode
    );
    printValidationSummary(validationResult);

    // 8. Supabase에 저장
    if (!cliOptions.dryRun && validationResult.valid.length > 0) {
      console.log('=' . repeat(60));
      const importer = new SupabaseImporter(
        config.supabaseUrl,
        config.supabaseKey
      );

      const importResult = await importer.importShops(
        validationResult.valid,
        {
          batchSize: config.batchSize,
          upsert: config.upsertMode,
        }
      );

      console.log('\n' + '=' . repeat(60));
      console.log('🎉 크롤링 완료!\n');

      // 최종 통계
      const finalCount = await importer.getShopCount();
      console.log('📊 최종 통계:');
      console.log(`   - 크롤링: ${rawPlaces.length}개`);
      console.log(`   - 검증 통과: ${validationResult.valid.length}개`);
      console.log(`   - DB 저장 성공: ${importResult.success}개`);
      console.log(`   - DB 저장 실패: ${importResult.failed}개`);
      console.log(`   - 현재 총 Shop 수: ${finalCount}개`);
    } else if (cliOptions.dryRun) {
      console.log('\n' + '=' . repeat(60));
      console.log('🎉 DRY-RUN 완료!\n');
      console.log('📊 통계:');
      console.log(`   - 크롤링: ${rawPlaces.length}개`);
      console.log(`   - 검증 통과: ${validationResult.valid.length}개`);
      console.log(`   - 검증 실패: ${validationResult.invalid.length}개`);
      console.log(`   - 중복: ${validationResult.duplicates}개`);
    } else {
      console.log('\n⚠️  검증 통과한 데이터가 없어 저장하지 않습니다.');
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  총 소요 시간: ${totalTime}초`);
    console.log('=' . repeat(60));
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}
