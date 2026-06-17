/**
 * Supabase DB Importer
 *
 * 검증된 Shop 데이터를 Supabase에 저장합니다.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ValidatedShop } from './data-validator';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ImportOptions {
  upsert?: boolean; // true: 충돌 시 업데이트, false: 충돌 시 스킵
  batchSize?: number; // 한 번에 insert할 개수 (기본: 50)
  dryRun?: boolean; // true: 실제 DB 저장 안 함 (테스트용)
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
}

interface ImportError {
  shopId: string;
  shopName: string;
  reason: string;
}

export class SupabaseImporter {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url =
      supabaseUrl ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;

    const key =
      supabaseKey ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        'Supabase URL과 Anon Key가 필요합니다. .env 파일을 확인하세요.'
      );
    }

    this.client = createClient(url, key);
    console.log('✅ Supabase 클라이언트 초기화 완료\n');
  }

  /**
   * Shop 데이터를 Supabase에 import
   *
   * @param shops 검증된 Shop 배열
   * @param options Import 옵션
   * @returns Import 결과
   */
  async importShops(
    shops: ValidatedShop[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const {
      upsert = true,
      batchSize = 50,
      dryRun = false,
    } = options;

    if (dryRun) {
      console.log('🔍 [DRY RUN 모드] 실제 DB 저장 없이 시뮬레이션만 수행합니다\n');
    }

    console.log(`\n📦 Import 시작: ${shops.length}개 (배치 크기: ${batchSize})\n`);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // 배치 단위로 처리
    for (let i = 0; i < shops.length; i += batchSize) {
      const batch = shops.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(shops.length / batchSize);

      console.log(
        `📦 배치 ${batchNumber}/${totalBatches} 처리 중 (${batch.length}개)...`
      );

      if (dryRun) {
        // Dry run: 실제 저장하지 않고 로그만 출력
        result.success += batch.length;
        console.log(`  ✅ [DRY RUN] ${batch.length}개 시뮬레이션 완료`);
        continue;
      }

      // 실제 DB 저장
      try {
        const dbRecords = batch.map(shop => this.toDbRecord(shop));

        if (upsert) {
          // Upsert: 충돌 시 업데이트
          const { error } = await this.client
            .from('shops')
            .upsert(dbRecords, {
              onConflict: 'kakao_place_id', // Kakao Place ID로 중복 감지
            });

          if (error) {
            throw error;
          }
        } else {
          // Insert: 충돌 시 에러
          const { error } = await this.client
            .from('shops')
            .insert(dbRecords);

          if (error) {
            throw error;
          }
        }

        result.success += batch.length;
        console.log(`  ✅ ${batch.length}개 저장 완료`);
      } catch (error: any) {
        result.failed += batch.length;

        // 배치 전체 실패 시 개별 처리 시도
        console.log(`  ⚠️  배치 실패, 개별 처리 시도...`);

        for (const shop of batch) {
          try {
            const dbRecord = this.toDbRecord(shop);

            if (upsert) {
              const { error } = await this.client
                .from('shops')
                .upsert([dbRecord], { onConflict: 'kakao_place_id' });

              if (error) throw error;
            } else {
              const { error } = await this.client
                .from('shops')
                .insert([dbRecord]);

              if (error) throw error;
            }

            result.success++;
            result.failed--;
            console.log(`    ✅ ${shop.name} 저장 완료`);
          } catch (individualError: any) {
            result.errors.push({
              shopId: shop.id,
              shopName: shop.name,
              reason: individualError.message || String(individualError),
            });
            console.log(`    ❌ ${shop.name} 실패: ${individualError.message}`);
          }
        }
      }
    }

    console.log(`\n📊 Import 결과:`);
    console.log(`  ✅ 성공: ${result.success}개`);
    console.log(`  ❌ 실패: ${result.failed}개`);

    if (result.errors.length > 0) {
      console.log(`\n❌ 실패 항목 상세:`);
      result.errors.forEach((err) => {
        console.log(`  - ${err.shopName} (${err.shopId}): ${err.reason}`);
      });
    }

    return result;
  }

  /**
   * ValidatedShop을 DB 레코드로 변환
   *
   * @param shop ValidatedShop 객체
   * @returns DB 레코드 (snake_case)
   */
  private toDbRecord(shop: ValidatedShop): any {
    return {
      // id는 DB 기본값(uuid)으로 생성하고, upsert 업데이트 시 기존 id를 유지합니다.
      kakao_place_id: shop.id, // Kakao Place ID는 별도 컬럼에 저장
      name: shop.name,
      address: shop.address,
      lat: shop.lat,
      lng: shop.lng,
      kakao_place_url: shop.kakaoPlaceUrl || null,
      phone: shop.phone || null,
      business_hours: shop.businessHours || null,
      instagram_url: shop.instagramUrl || null,
      kakao_rating: shop.kakaoRating || null,
      // created_at, updated_at은 DB에서 자동 설정됨
    };
  }

  /**
   * 특정 Shop이 이미 DB에 존재하는지 확인
   *
   * @param shopId Kakao Place ID
   * @returns 존재 여부
   */
  async shopExists(shopId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('shops')
      .select('id')
      .eq('kakao_place_id', shopId)
      .single();

    return !error && !!data;
  }

  /**
   * DB 연결 테스트
   *
   * @returns 연결 성공 여부
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('shops')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ DB 연결 실패:', error.message);
        return false;
      }

      console.log('✅ DB 연결 성공\n');
      return true;
    } catch (error) {
      console.error('❌ DB 연결 실패:', error);
      return false;
    }
  }
}
