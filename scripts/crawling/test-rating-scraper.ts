/**
 * 평점 스크래퍼 테스트 스크립트
 *
 * 실제 카카오 맵 페이지에서 평점을 추출하는지 테스트합니다.
 */

import * as dotenv from 'dotenv';
import { KakaoApiClient } from './kakao-api';
import { KakaoDetailScraper } from './kakao-detail-scraper';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function testRatingScraper() {
  console.log('🧪 카카오 맵 평점 스크래퍼 테스트\n');

  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    console.error('❌ KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  try {
    // Step 1: Kakao API로 서울 라멘집 검색 (3개만)
    console.log('📍 Step 1: 카카오 API로 라멘집 검색 중...\n');
    const client = new KakaoApiClient(kakaoApiKey, 500);
    const response = await client.searchPlaces({
      query: '서울 라멘',
      size: 3, // 3개만 테스트
      page: 1,
    });

    if (response.documents.length === 0) {
      console.log('⚠️  검색 결과가 없습니다.');
      return;
    }

    console.log(`✅ ${response.documents.length}개 장소 발견\n`);

    // Step 2: 상세 페이지 스크래핑 (평점 추출)
    console.log('🕷️  Step 2: 상세 페이지 스크래핑 시작...\n');
    const scraper = new KakaoDetailScraper(1000);

    for (let i = 0; i < response.documents.length; i++) {
      const place = response.documents[i];
      console.log(`\n[${i + 1}/${response.documents.length}] ${place.place_name}`);
      console.log(`   URL: ${place.place_url}`);

      const detail = await scraper.scrapePlaceDetails(place.place_url);

      // 결과 출력
      if (detail.rating !== undefined) {
        console.log(`   ✅ 평점: ${detail.rating}점`);
      } else {
        console.log(`   ℹ️  평점 없음`);
      }

      if (detail.socialLinks.instagram) {
        console.log(`   ✅ Instagram: ${detail.socialLinks.instagram}`);
      } else {
        console.log(`   ℹ️  Instagram 없음`);
      }
    }

    console.log('\n✅ 테스트 완료!');
  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:');
    console.error(error);
    process.exit(1);
  }
}

testRatingScraper();
