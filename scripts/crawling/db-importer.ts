/**
 * Supabase Database Importer
 *
 * 검증된 Shop 데이터를 Supabase에 배치로 저장합니다.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ValidatedShop } from './data-validator';

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    shop: ValidatedShop;
    error: string;
  }>;
}

export interface ImportOptions {
  batchSize?: number; // 한 번에 삽입할 데이터 개수 (기본값: 50)
  upsert?: boolean; // 중복 시 업데이트 여부 (기본값: false)
}

/**
 * Supabase에 Shop 데이터 배치 삽입
 */
export class SupabaseImporter {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Shop 데이터 배치 삽입
   *
   * @param shops 저장할 Shop 데이터 배열
   * @param options 삽입 옵션
   * @returns 삽입 결과
   */
  async importShops(
    shops: ValidatedShop[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const batchSize = options.batchSize || 50;
    const upsert = options.upsert || false;

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    console.log(`\n📤 Supabase에 ${shops.length}개 Shop 저장 시작...`);
    console.log(`   배치 크기: ${batchSize}개`);
    console.log(`   Upsert 모드: ${upsert ? '활성화' : '비활성화'}\n`);

    // 배치로 나누어 처리
    const batches = this.createBatches(shops, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      console.log(
        `  배치 ${batchNumber}/${batches.length}: ${batch.length}개 처리 중...`
      );

      try {
        const batchResult = await this.insertBatch(batch, upsert);
        result.success += batchResult.success;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);

        console.log(
          `    ✅ 성공: ${batchResult.success}개, ❌ 실패: ${batchResult.failed}개`
        );
      } catch (error) {
        console.error(`    ❌ 배치 ${batchNumber} 처리 중 오류:`, error);
        result.failed += batch.length;
        batch.forEach(shop => {
          result.errors.push({
            shop,
            error:
              error instanceof Error ? error.message : '알 수 없는 오류',
          });
        });
      }
    }

    console.log(`\n✅ 저장 완료:`);
    console.log(`   - 성공: ${result.success}개`);
    console.log(`   - 실패: ${result.failed}개`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  오류 상세:`);
      result.errors.slice(0, 5).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.shop.name}: ${err.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... 그 외 ${result.errors.length - 5}개 오류`);
      }
    }

    return result;
  }

  /**
   * 단일 배치 삽입
   */
  private async insertBatch(
    batch: ValidatedShop[],
    upsert: boolean
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const { data, error } = upsert
        ? await this.supabase
            .from('shops')
            .upsert(batch, {
              onConflict: 'name,address', // 이름과 주소가 같으면 업데이트
            })
            .select()
        : await this.supabase.from('shops').insert(batch).select();

      if (error) {
        throw error;
      }

      result.success = data?.length || batch.length;
    } catch (error) {
      // Supabase 오류 처리
      if (this.isSupabaseError(error)) {
        // 개별 항목 오류인 경우 재시도
        if (error.code === '23505') {
          // Unique constraint violation
          console.log(
            '    ⚠️  중복 키 감지, 개별 삽입으로 재시도 중...'
          );
          return await this.insertIndividually(batch);
        }

        // 기타 Supabase 오류
        batch.forEach(shop => {
          result.errors.push({
            shop,
            error: `${error.code}: ${error.message}`,
          });
        });
        result.failed = batch.length;
      } else {
        // 일반 오류
        batch.forEach(shop => {
          result.errors.push({
            shop,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
          });
        });
        result.failed = batch.length;
      }
    }

    return result;
  }

  /**
   * 개별 삽입 (중복 오류 시 사용)
   */
  private async insertIndividually(
    shops: ValidatedShop[]
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const shop of shops) {
      try {
        const { error } = await this.supabase
          .from('shops')
          .insert(shop)
          .select();

        if (error) {
          if (error.code === '23505') {
            // 중복은 조용히 건너뛰기
            continue;
          }
          throw error;
        }

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          shop,
          error:
            error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    return result;
  }

  /**
   * 배열을 배치로 나누기
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Supabase 오류인지 확인
   */
  private isSupabaseError(error: any): error is {
    code: string;
    message: string;
    details: string;
  } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    );
  }

  /**
   * 데이터베이스 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('shops')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Supabase 연결 실패:', error.message);
        return false;
      }

      console.log('✅ Supabase 연결 성공');
      return true;
    } catch (error) {
      console.error('❌ Supabase 연결 오류:', error);
      return false;
    }
  }

  /**
   * 현재 Shop 개수 조회
   */
  async getShopCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('shops')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Shop 개수 조회 실패:', error);
      return 0;
    }
  }
}
