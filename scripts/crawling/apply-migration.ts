/**
 * Apply Migration Script
 *
 * 마이그레이션 SQL을 직접 실행합니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function applyMigration(migrationFile: string) {
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

  console.log(`\n📝 마이그레이션 파일 읽기: ${migrationFile}\n`);

  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('실행할 SQL:\n');
  console.log(sql);
  console.log('\n---\n');

  // SQL 실행
  const { data, error } = await client.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    console.error('상세:', error);
    return false;
  }

  console.log('✅ 마이그레이션 성공!');
  return true;
}

// CLI에서 실행
const migrationFile = process.argv[2] || '20260617000002_add_shop_delete_policy.sql';

applyMigration(migrationFile)
  .then((success) => {
    if (success) {
      console.log('\n✨ 작업 완료\n');
      process.exit(0);
    } else {
      console.log('\n❌ 작업 실패\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
