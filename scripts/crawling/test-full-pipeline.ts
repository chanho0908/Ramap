/**
 * 전체 크롤링 파이프라인 테스트 (소규모)
 *
 * 10개 정도만 크롤링해서 전체 파이프라인을 테스트합니다.
 */

import * as dotenv from 'dotenv';
import { KakaoApiClient } from './kakao-api';
import { KakaoDetailScraper } from './kakao-detail-scraper';
import { DataValidator } from './data-validator';
import { SupabaseImporter } from './db-importer';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function testFullPipeline() {
  console.log('=' .repeat(60));
  console.log('🧪 전체 크롤링 파이프라인 테스트 (소규모)');
  console.log('=' .repeat(60));
  console.log('');

  const startTime = Date.now();

  try {
    // 환경 변수 확인
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!kakaoApiKey || !supabaseUrl || !supabaseKey) {
      console.error('❌ 환경 변수가 설정되지 않았습니다.');
      process.exit(1);
    }

    // Step 1: Kakao API 검색
    console.log('📍 Step 1: Kakao API 검색\n');
    const kakaoClient = new KakaoApiClient(kakaoApiKey, 500);

    const response = await kakaoClient.searchPlaces({
      query: '서울 라멘',
      size: 5, // 5개만 테스트
      page: 1,
    });

    console.log(`✅ ${response.documents.length}개 장소 발견\n`);

    if (response.documents.length === 0) {
      console.log('⚠️  검색 결과가 없습니다.');
      return;
    }

    // Step 2: 상세 페이지 스크래핑 (Puppeteer)
    console.log('🕷️  Step 2: 상세 페이지 스크래핑 (Instagram + 평점)\n');

    const scraper = new KakaoDetailScraper(1000, true); // headless mode
    const placeUrls = response.documents.map(p => p.place_url);
    const details = await scraper.scrapeBatch(placeUrls);

    const placeDetailsMap = new Map(
      details.map(d => [d.placeId, d])
    );

    // 통계
    const instagramCount = details.filter(d => d.socialLinks.instagram).length;
    const ratingCount = details.filter(d => d.rating !== undefined).length;

    console.log(`📊 스크래핑 통계:`);
    console.log(`  - Instagram URL: ${instagramCount}/${details.length}개`);
    console.log(`  - 평점: ${ratingCount}/${details.length}개\n`);

    // Step 3: 데이터 검증
    console.log('✅ Step 3: 데이터 검증\n');

    const validator = new DataValidator();
    const validationResult = validator.validateAndTransform(
      response.documents,
      placeDetailsMap
    );

    const unique = validator.deduplicate(validationResult.valid);

    console.log(`검증 완료: ${unique.length}개 유효\n`);

    // 샘플 데이터 출력
    console.log('📋 샘플 데이터 (처음 3개):\n');
    unique.slice(0, 3).forEach((shop, i) => {
      console.log(`[${i + 1}] ${shop.name}`);
      console.log(`    주소: ${shop.address}`);
      console.log(`    좌표: ${shop.lat}, ${shop.lng}`);
      console.log(`    평점: ${shop.kakaoRating ? shop.kakaoRating + '점' : '없음'}`);
      console.log(`    Instagram: ${shop.instagramUrl || '없음'}`);
      console.log('');
    });

    // Step 4: DB 저장 (DRY RUN)
    console.log('💾 Step 4: Supabase 저장 시뮬레이션 (DRY RUN)\n');

    const importer = new SupabaseImporter(supabaseUrl, supabaseKey);

    // DB 연결 테스트
    const connected = await importer.testConnection();
    if (!connected) {
      console.error('❌ Supabase 연결 실패');
      return;
    }

    const importResult = await importer.importShops(unique, {
      upsert: true,
      batchSize: 50,
      dryRun: true, // 실제로 저장하지 않음
    });

    // 결과 요약
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 테스트 완료 요약');
    console.log('='.repeat(60));
    console.log(`⏱️  소요 시간: ${duration}초`);
    console.log(`🔍 검색 결과: ${response.documents.length}개`);
    console.log(`✅ 유효한 데이터: ${unique.length}개`);
    console.log(`📸 Instagram URL: ${unique.filter(s => s.instagramUrl).length}개`);
    console.log(`⭐ 평점: ${unique.filter(s => s.kakaoRating).length}개`);
    console.log(`💾 저장 시뮬레이션: ${importResult.success}개 (DRY RUN)`);
    console.log('='.repeat(60));
    console.log('✅ 전체 파이프라인 테스트 성공!\n');

    console.log('📌 다음 단계:');
    console.log('  1. 데이터베이스 마이그레이션 적용');
    console.log('  2. pnpm crawl:shops 실행 (실제 크롤링)');

  } catch (error) {
    console.error('\n❌ 테스트 중 오류:');
    console.error(error);
    process.exit(1);
  }
}

testFullPipeline();
