/**
 * Check Shop by Name Script
 *
 * 특정 이름을 가진 Shop이 데이터베이스에 존재하는지 확인합니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkShopsByName(name: string) {
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

  console.log(`\n🔍 "${name}" 이름을 가진 Shop 검색 중...\n`);

  const { data: shops, error: selectError } = await client
    .from('shops')
    .select('*')
    .like('name', `%${name}%`);

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    return;
  }

  if (!shops || shops.length === 0) {
    console.log(`✅ "${name}" 이름을 가진 Shop이 없습니다. (삭제 완료)`);
    return;
  }

  console.log(`📋 찾은 레코드 (${shops.length}개):\n`);
  shops.forEach((shop, index) => {
    console.log(`${index + 1}. ID: ${shop.id}`);
    console.log(`   이름: ${shop.name}`);
    console.log(`   주소: ${shop.address}`);
    console.log(`   좌표: (${shop.lat}, ${shop.lng})`);
    console.log('');
  });
}

// CLI에서 실행
const targetName = process.argv[2] || '벌툰';

checkShopsByName(targetName)
  .then(() => {
    console.log('\n✨ 조회 완료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
