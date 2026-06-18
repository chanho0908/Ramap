/**
 * Clean Kakao Map Prefix Script
 *
 * description 필드에서 "카카오맵:" 접두사를 제거하고 URL만 남깁니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

interface Shop {
  id: string;
  name: string;
  description: string;
}

async function cleanKakaoMapPrefix(dryRun: boolean = false) {
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

  console.log('\n🔍 "카카오맵:" 접두사가 포함된 레코드 검색 중...\n');

  // "카카오맵:" 접두사가 포함된 레코드 조회
  const { data: shops, error: selectError } = await client
    .from('shops')
    .select('id, name, description')
    .like('description', '카카오맵:%');

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    throw selectError;
  }

  if (!shops || shops.length === 0) {
    console.log('✅ "카카오맵:" 접두사가 포함된 레코드가 없습니다.\n');
    return;
  }

  console.log(`📋 찾은 레코드: ${shops.length}개\n`);

  if (dryRun) {
    console.log('⚠️  [DRY RUN 모드] 실제 업데이트 없이 미리보기만 수행합니다.\n');
  }

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < shops.length; i++) {
    const shop = shops[i] as Shop;
    const index = i + 1;

    console.log(`[${index}/${shops.length}] ${shop.name}`);
    console.log(`  ID: ${shop.id}`);
    console.log(`  현재: ${shop.description}`);

    // "카카오맵:" 접두사 제거
    const cleaned = shop.description
      .replace(/^카카오맵:\s*/, '') // "카카오맵: " 제거
      .replace(/^http:\/\//, 'https://') // http를 https로 변경
      .trim();

    console.log(`  변경: ${cleaned}`);

    if (dryRun) {
      console.log(`  ✅ [DRY RUN] 업데이트 예정\n`);
      successCount++;
      continue;
    }

    // description 업데이트
    const { error: updateError } = await client
      .from('shops')
      .update({ description: cleaned })
      .eq('id', shop.id);

    if (updateError) {
      console.log(`  ❌ 업데이트 실패: ${updateError.message}\n`);
      failedCount++;
    } else {
      console.log(`  ✅ 업데이트 완료\n`);
      successCount++;
    }
  }

  console.log('=' .repeat(60));
  console.log('📊 정리 완료 요약');
  console.log('=' .repeat(60));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failedCount}개`);
  console.log(`📋 총 처리: ${shops.length}개`);

  if (dryRun) {
    console.log(`\n⚠️  [DRY RUN 모드] 실제 DB에 저장되지 않았습니다.`);
  }

  console.log('=' .repeat(60));
  console.log('\n✨ 작업 완료!\n');
}

// CLI 실행
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('⚙️  실행 모드: DRY RUN (미리보기만 수행)\n');
} else {
  console.log('⚙️  실행 모드: LIVE (실제 DB 업데이트)\n');
}

cleanKakaoMapPrefix(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
