/**
 * Delete Specific Shop Script
 *
 * 특정 이름의 가게를 삭제합니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

async function deleteShopByName(shopName: string, dryRun: boolean = false) {
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

  console.log(`\n🔍 "${shopName}" 이름을 가진 Shop 검색 중...\n`);

  const { data: shops, error: selectError } = await client
    .from('shops')
    .select('*')
    .like('name', `%${shopName}%`);

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    throw selectError;
  }

  if (!shops || shops.length === 0) {
    console.log(`✅ "${shopName}" 이름을 가진 Shop이 없습니다.\n`);
    return;
  }

  console.log(`📋 찾은 레코드: ${shops.length}개\n`);

  shops.forEach((shop, index) => {
    console.log(`[${index + 1}] ${shop.name}`);
    console.log(`    ID: ${shop.id}`);
    console.log(`    주소: ${shop.address}`);
    console.log(`    좌표: (${shop.lat}, ${shop.lng})`);
    console.log('');
  });

  if (dryRun) {
    console.log('⚠️  [DRY RUN 모드] 실제 삭제하지 않습니다.\n');
    return;
  }

  console.log('🗑️  삭제 중...\n');

  const ids = shops.map(shop => shop.id);
  const { error: deleteError } = await client
    .from('shops')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message);
    throw deleteError;
  }

  console.log(`✅ ${shops.length}개의 레코드가 삭제되었습니다.\n`);
}

// CLI 실행
const shopName = process.argv[2] || '탄탄면공방';
const dryRun = process.argv.includes('--dry-run');

if (dryRun) {
  console.log('⚙️  실행 모드: DRY RUN (미리보기만 수행)\n');
} else {
  console.log('⚠️  실행 모드: LIVE (실제 DB 삭제)\n');
}

deleteShopByName(shopName, dryRun)
  .then(() => {
    console.log('\n✨ 작업 완료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
