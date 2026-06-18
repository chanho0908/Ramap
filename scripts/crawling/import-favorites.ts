#!/usr/bin/env node

/**
 * 즐겨찾기 라멘집 수동 추가 스크립트
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { KakaoApiClient } from './kakao-api';
import { validateAndTransformPlaces } from './data-validator';
import { SupabaseImporter } from './db-importer';
import { loadCrawlConfig } from './config';

interface FavoriteShop {
  name: string;
  address: string;
}

const FAVORITE_SHOPS: FavoriteShop[] = [
  { name: '멘타카무쇼 광교점', address: '경기 수원시 영통구 센트럴타운로 107 지하1층 39호' },
  { name: '라멘보루도', address: '서울 종로구 서순라길 123-8 1층' },
  { name: '사이토라', address: '서울 종로구 세종대로23길 54 지하 115~116호' },
  { name: '왓쇼이켄', address: '서울 강남구 테헤란로4길 46 쌍용플래티넘밸류상가 지하1층 B120호' },
  { name: '오레노라멘 합정본점', address: '서울 마포구 독막로8길 16 1층' },
  { name: '지로우라멘', address: '서울 마포구 와우산로29가길 79 1층' },
  { name: '하나라멘', address: '서울 마포구 동교로38길 27-4 1층' },
  { name: '멘야수', address: '서울 마포구 양화로 56 동양한강트레벨 B103-2호' },
  { name: '힛사츠와자', address: '서울 마포구 포은로 97-1 1층' },
  { name: '라멘롱시즌', address: '서울 마포구 동교로34길 21 1층' },
  { name: '오레노라멘 강남점', address: '서울 강남구 테헤란로1길 28-9 2층' },
  { name: '566라멘', address: '서울 마포구 연남로3길 33 1층' },
  { name: '멘타미', address: '서울 용산구 한강대로76길 9 1층' },
  { name: '마포라스토랑', address: '서울 마포구 와우산로11길 28 지하1층 B03호' },
  { name: '아키야라멘', address: '서울 마포구 토정로 39-3 1층' },
  { name: '진세이라멘', address: '서울 마포구 성미산로 186 2층' },
  { name: '나니요리', address: '서울 송파구 백제고분로46길 4 1층' },
  { name: '류진', address: '서울 마포구 월드컵로17길 64 지층' },
  { name: '유니드라멘', address: '서울 광진구 능동로37길 44 1층' },
  { name: '신멘', address: '경기 안양시 동안구 호성로 20 상가 1층 101호' },
  { name: '멘큐단', address: '경기 안양시 동안구 관평로69번길 19 1층 101호' },
  { name: '라멘구락부', address: '경기 의왕시 계원대학로 28 명성프라자 1층 112호' },
  { name: '라멘바 시코우', address: '서울 마포구 와우산로7길 33 1층 101호' },
  { name: '요아케', address: '서울 중구 퇴계로74길 9 1층' },
  { name: '희옥', address: '서울 마포구 월드컵로19길 74 1층 102호' },
  { name: '이리에라멘', address: '서울 마포구 성지1길 18 1층' },
  { name: '쿄라멘', address: '서울 마포구 동교로46길 25 지층' },
  { name: '무겐스위치', address: '서울 마포구 동교로 242-13 1층' },
  { name: '소바하우스 멘야준', address: '서울 마포구 월드컵북로6길 84 1층' },
  { name: '멘야준', address: '서울 마포구 동교로 128' },
  { name: '하쿠텐', address: '서울 마포구 동교로 266-12' },
  { name: '신바야시 쇼쿠도', address: '서울 관악구 신림로64길 11 1층' },
  { name: '코우짱라멘', address: '서울 관악구 봉천로 227 보라매 샤르망 1층 101~102호' },
  { name: '라멘 시미즈', address: '서울 종로구 새문안로3길 12 지하1층 37호' },
  { name: '하카타분코', address: '서울 마포구 독막로19길 43 1층' },
  { name: '마시타야', address: '서울 마포구 와우산로29라길 26' },
  { name: '라멘파이터즈', address: '서울 마포구 동교로38길 27-14' },
];

async function main(): Promise<void> {
  console.log('🍜 즐겨찾기 라멘집 추가 시작\n');
  console.log('='.repeat(60));

  try {
    const config = loadCrawlConfig();

    console.log(`📋 추가할 가게 수: ${FAVORITE_SHOPS.length}개\n`);

    // Kakao API 클라이언트 초기화
    console.log('🔧 Kakao API 클라이언트 초기화...');
    const kakaoClient = new KakaoApiClient(
      config.kakaoApiKey,
      config.requestDelayMs
    );
    console.log('✅ 초기화 완료\n');

    // Supabase 연결
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

    console.log('='.repeat(60));
    console.log('🔍 각 가게 검색 시작\n');

    const allPlaces = [];
    let foundCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < FAVORITE_SHOPS.length; i++) {
      const shop = FAVORITE_SHOPS[i];
      const num = i + 1;

      console.log(`[${num}/${FAVORITE_SHOPS.length}] "${shop.name}" 검색 중...`);

      try {
        // 가게 이름으로 검색
        const response = await kakaoClient.searchPlaces({
          query: shop.name,
          size: 5,
        });

        if (response.documents.length > 0) {
          // 주소 매칭으로 정확한 가게 찾기
          const matchedPlace = response.documents.find(place => {
            const addressMatch =
              place.address_name.includes(shop.address.substring(0, 10)) ||
              place.road_address_name.includes(shop.address.substring(0, 10)) ||
              shop.address.includes(place.address_name.substring(0, 10));
            return addressMatch;
          });

          if (matchedPlace) {
            allPlaces.push(matchedPlace);
            foundCount++;
            console.log(`  ✅ 찾음: ${matchedPlace.place_name} (${matchedPlace.address_name})`);
          } else {
            // 첫 번째 결과 사용
            allPlaces.push(response.documents[0]);
            foundCount++;
            console.log(`  ⚠️  유사 결과: ${response.documents[0].place_name}`);
          }
        } else {
          notFoundCount++;
          console.log(`  ❌ 검색 결과 없음`);
        }
      } catch (error) {
        notFoundCount++;
        console.error(`  ❌ 오류:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`\n📊 검색 완료:`);
    console.log(`   - 찾음: ${foundCount}개`);
    console.log(`   - 못 찾음: ${notFoundCount}개\n`);

    if (allPlaces.length === 0) {
      console.log('⚠️  추가할 가게가 없습니다.');
      return;
    }

    // 데이터 검증
    console.log('='.repeat(60));
    console.log('✅ 데이터 검증 및 변환\n');

    const validationResult = validateAndTransformPlaces(allPlaces, false);

    console.log(`\n📊 검증 요약:`);
    console.log(`   - 유효: ${validationResult.valid.length}개`);
    console.log(`   - 무효: ${validationResult.invalid.length}개`);
    console.log(`   - 중복: ${validationResult.duplicates}개\n`);

    if (validationResult.valid.length === 0) {
      console.log('⚠️  저장할 유효한 데이터가 없습니다.');
      return;
    }

    // Supabase에 저장
    console.log('='.repeat(60));
    const importResult = await importer.importShops(
      validationResult.valid,
      {
        batchSize: 50,
        upsert: false,
      }
    );

    console.log('\n' + '='.repeat(60));
    console.log('🎉 즐겨찾기 추가 완료!\n');

    const finalCount = await importer.getShopCount();
    console.log('📊 최종 통계:');
    console.log(`   - 검색 시도: ${FAVORITE_SHOPS.length}개`);
    console.log(`   - 검색 성공: ${foundCount}개`);
    console.log(`   - 검증 통과: ${validationResult.valid.length}개`);
    console.log(`   - DB 저장 성공: ${importResult.success}개`);
    console.log(`   - DB 저장 실패: ${importResult.failed}개`);
    console.log(`   - 현재 총 Shop 수: ${finalCount}개`);

    console.log('\n='.repeat(60));
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}
