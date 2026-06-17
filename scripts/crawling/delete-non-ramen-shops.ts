/**
 * Delete Non-Ramen Shops Script
 *
 * name 컬럼에 라멘이 아닌 다른 음식점 키워드가 포함된 레코드를 삭제합니다.
 * 키워드: 돈가스, 카츠, 라면, 카레, 이자카야, 스시
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

interface Shop {
  id: string;
  name: string;
  address: string;
}

// 제외할 키워드 목록
const EXCLUDE_KEYWORDS = [
  '돈가스',
  '돈까스',
  '카츠',
  '라면',    // 라멘이 아닌 한국식 라면
  '카레',
  '이자카야',
  '스시',
  '초밥',
];

async function deleteNonRamenShops(dryRun: boolean = false) {
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

  console.log('\n🔍 제외할 키워드가 포함된 레코드 검색 중...\n');
  console.log(`키워드: ${EXCLUDE_KEYWORDS.join(', ')}\n`);

  // 모든 shops 조회
  const { data: allShops, error: selectError } = await client
    .from('shops')
    .select('id, name, address')
    .order('name');

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    throw selectError;
  }

  if (!allShops || allShops.length === 0) {
    console.log('✅ 레코드가 없습니다.\n');
    return;
  }

  // 제외할 레코드 필터링
  const shopsToDelete: Shop[] = [];
  const shopsByKeyword: Record<string, Shop[]> = {};

  // 키워드별로 초기화
  EXCLUDE_KEYWORDS.forEach(keyword => {
    shopsByKeyword[keyword] = [];
  });

  allShops.forEach((shop) => {
    let shouldDelete = false;
    const matchedKeywords: string[] = [];

    EXCLUDE_KEYWORDS.forEach((keyword) => {
      if (shop.name.includes(keyword)) {
        shouldDelete = true;
        matchedKeywords.push(keyword);
        shopsByKeyword[keyword].push(shop);
      }
    });

    if (shouldDelete && !shopsToDelete.find(s => s.id === shop.id)) {
      shopsToDelete.push({
        id: shop.id,
        name: shop.name,
        address: shop.address,
      });
    }
  });

  console.log(`📋 총 레코드: ${allShops.length}개`);
  console.log(`🗑️  삭제 대상: ${shopsToDelete.length}개\n`);

  // 키워드별 통계
  console.log('📊 키워드별 통계:\n');
  EXCLUDE_KEYWORDS.forEach((keyword) => {
    const count = shopsByKeyword[keyword].length;
    if (count > 0) {
      console.log(`  ${keyword}: ${count}개`);
    }
  });
  console.log('');

  if (shopsToDelete.length === 0) {
    console.log('✅ 삭제할 레코드가 없습니다.\n');
    return;
  }

  if (dryRun) {
    console.log('⚠️  [DRY RUN 모드] 실제 삭제 없이 미리보기만 수행합니다.\n');
  }

  // 삭제 대상 샘플 출력 (최대 20개)
  console.log('🗑️  삭제 대상 샘플 (최대 20개):\n');
  shopsToDelete.slice(0, 20).forEach((shop, idx) => {
    console.log(`[${idx + 1}] ${shop.name}`);
    console.log(`    ID: ${shop.id}`);
    console.log(`    주소: ${shop.address}`);
    console.log('');
  });

  if (shopsToDelete.length > 20) {
    console.log(`... 외 ${shopsToDelete.length - 20}개\n`);
  }

  if (dryRun) {
    console.log('✅ [DRY RUN] 미리보기 완료\n');
    return;
  }

  // 실제 삭제
  console.log('🗑️  삭제 시작...\n');

  let successCount = 0;
  let failedCount = 0;

  // 배치 삭제 (50개씩)
  const batchSize = 50;
  for (let i = 0; i < shopsToDelete.length; i += batchSize) {
    const batch = shopsToDelete.slice(i, i + batchSize);
    const ids = batch.map(shop => shop.id);

    const { error: deleteError } = await client
      .from('shops')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.log(`  ❌ 배치 ${Math.floor(i / batchSize) + 1} 삭제 실패: ${deleteError.message}`);
      failedCount += batch.length;
    } else {
      console.log(`  ✅ 배치 ${Math.floor(i / batchSize) + 1} 삭제 완료: ${batch.length}개`);
      successCount += batch.length;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 삭제 완료 요약');
  console.log('='.repeat(60));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failedCount}개`);
  console.log(`📋 총 처리: ${shopsToDelete.length}개`);
  console.log('='.repeat(60));
  console.log('\n✨ 작업 완료!\n');
}

// CLI 실행
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('⚙️  실행 모드: DRY RUN (미리보기만 수행)\n');
} else {
  console.log('⚠️  실행 모드: LIVE (실제 DB 삭제)\n');
}

deleteNonRamenShops(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
