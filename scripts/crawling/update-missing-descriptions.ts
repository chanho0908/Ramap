/**
 * Update Missing Descriptions Script
 *
 * shops 테이블에서 description이 null인 레코드를 찾아서
 * kakao_place_id를 이용해 Kakao Map URL을 생성하여 description에 채웁니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

interface Shop {
  id: string;
  name: string;
  kakao_place_id: string;
  description: string | null;
}

async function updateMissingDescriptions(dryRun: boolean = false) {
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

  console.log('\n🔍 description이 없는 shops 검색 중...\n');

  // description이 null이거나 빈 문자열인 레코드 조회
  const { data: shops, error: selectError } = await client
    .from('shops')
    .select('id, name, kakao_place_id, description')
    .or('description.is.null,description.eq.');

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    throw selectError;
  }

  if (!shops || shops.length === 0) {
    console.log('✅ description이 없는 레코드가 없습니다.\n');
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
    console.log(`  Kakao Place ID: ${shop.kakao_place_id}`);

    if (!shop.kakao_place_id) {
      console.log('  ⚠️  Kakao Place ID가 없어 건너뜁니다.\n');
      failedCount++;
      continue;
    }

    // Kakao Map URL 생성
    const kakaoMapUrl = `https://place.map.kakao.com/${shop.kakao_place_id}`;
    console.log(`  📍 생성된 URL: ${kakaoMapUrl}`);

    if (dryRun) {
      console.log(`  ✅ [DRY RUN] 업데이트 예정\n`);
      successCount++;
      continue;
    }

    // description 업데이트
    const { error: updateError } = await client
      .from('shops')
      .update({ description: kakaoMapUrl })
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
  console.log('📊 업데이트 완료 요약');
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

updateMissingDescriptions(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
