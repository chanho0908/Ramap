/**
 * Apply Migration: Rename description to kakao_place_url
 *
 * description 컬럼을 kakao_place_url로 rename하는 마이그레이션을 적용합니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

async function applyMigration() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase URL과 Key가 필요합니다. .env 파일을 확인하세요.'
    );
  }

  const client = createClient(url, key);

  console.log('\n🔧 마이그레이션 적용 중...\n');

  try {
    // SQL 실행: description → kakao_place_url 컬럼 rename
    const { error } = await client.rpc('exec_sql', {
      sql: `
        -- Rename description column to kakao_place_url
        ALTER TABLE shops RENAME COLUMN description TO kakao_place_url;

        -- Add comment to document the column purpose
        COMMENT ON COLUMN shops.kakao_place_url IS 'Kakao Map place URL (format: https://place.map.kakao.com/{place_id})';
      `,
    });

    if (error) {
      // RPC 함수가 없는 경우 직접 SQL 실행 시도
      console.log('⚠️  RPC 함수를 찾을 수 없습니다. 수동으로 마이그레이션을 적용해주세요.\n');
      console.log('다음 SQL을 Supabase Dashboard에서 실행하세요:\n');
      console.log('```sql');
      console.log('ALTER TABLE shops RENAME COLUMN description TO kakao_place_url;');
      console.log('COMMENT ON COLUMN shops.kakao_place_url IS \'Kakao Map place URL (format: https://place.map.kakao.com/{place_id})\';');
      console.log('```\n');
      return;
    }

    console.log('✅ 마이그레이션 적용 완료!\n');
    console.log('description 컬럼이 kakao_place_url로 변경되었습니다.\n');
  } catch (error: any) {
    console.error('❌ 마이그레이션 적용 실패:', error.message);
    console.log('\n수동으로 마이그레이션을 적용해주세요:');
    console.log('1. Supabase Dashboard (https://app.supabase.com) 접속');
    console.log('2. SQL Editor로 이동');
    console.log('3. 다음 SQL 실행:\n');
    console.log('```sql');
    console.log('ALTER TABLE shops RENAME COLUMN description TO kakao_place_url;');
    console.log('COMMENT ON COLUMN shops.kakao_place_url IS \'Kakao Map place URL (format: https://place.map.kakao.com/{place_id})\';');
    console.log('```\n');
  }
}

// CLI 실행
applyMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
