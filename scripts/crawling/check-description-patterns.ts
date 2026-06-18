/**
 * Check Description Patterns Script
 *
 * description 필드의 데이터 패턴을 분석합니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

async function checkDescriptionPatterns() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase URL과 Anon Key가 필요합니다. .env 파일을 확인하세요.'
    );
  }

  const client = createClient(url, key);

  console.log('\n🔍 description 필드 패턴 분석 중...\n');

  // 모든 shops 조회
  const { data: shops, error: selectError } = await client
    .from('shops')
    .select('id, name, description')
    .order('name');

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    throw selectError;
  }

  if (!shops || shops.length === 0) {
    console.log('✅ 레코드가 없습니다.\n');
    return;
  }

  console.log(`📋 총 레코드: ${shops.length}개\n`);

  // 패턴별 분류
  const patterns = {
    empty: [] as any[],
    withKakaoMapPrefix: [] as any[],
    urlOnly: [] as any[],
    other: [] as any[],
  };

  for (const shop of shops) {
    if (!shop.description || shop.description.trim() === '') {
      patterns.empty.push(shop);
    } else if (shop.description.includes('카카오맵:')) {
      patterns.withKakaoMapPrefix.push(shop);
    } else if (shop.description.startsWith('https://place.map.kakao.com/')) {
      patterns.urlOnly.push(shop);
    } else {
      patterns.other.push(shop);
    }
  }

  console.log('📊 패턴별 분류 결과:\n');
  console.log(`1. 빈 값: ${patterns.empty.length}개`);
  console.log(`2. "카카오맵:" 접두사 포함: ${patterns.withKakaoMapPrefix.length}개`);
  console.log(`3. URL만 있는 경우: ${patterns.urlOnly.length}개`);
  console.log(`4. 기타: ${patterns.other.length}개\n`);

  // "카카오맵:" 접두사 포함 샘플 출력
  if (patterns.withKakaoMapPrefix.length > 0) {
    console.log('="'.repeat(30));
    console.log('📝 "카카오맵:" 접두사 포함 샘플 (최대 10개):\n');
    patterns.withKakaoMapPrefix.slice(0, 10).forEach((shop, idx) => {
      console.log(`[${idx + 1}] ${shop.name}`);
      console.log(`    ID: ${shop.id}`);
      console.log(`    Description: ${shop.description}`);
      console.log('');
    });
    console.log('="'.repeat(30));
  }

  // 기타 패턴 샘플 출력
  if (patterns.other.length > 0) {
    console.log('\n📝 기타 패턴 샘플 (최대 10개):\n');
    patterns.other.slice(0, 10).forEach((shop, idx) => {
      console.log(`[${idx + 1}] ${shop.name}`);
      console.log(`    ID: ${shop.id}`);
      console.log(`    Description: ${shop.description}`);
      console.log('');
    });
  }

  console.log('✨ 분석 완료!\n');
}

// CLI 실행
checkDescriptionPatterns()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
