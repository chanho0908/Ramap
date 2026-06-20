#!/usr/bin/env node

/**
 * Shop 웨이팅 시스템 식별 스크립트
 *
 * 실시간 대기 데이터는 수집하지 않습니다.
 * Kakao Place 상세 페이지의 외부 링크만 확인해 Shop이 사용하는 provider 메타데이터만 저장합니다.
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WaitingProvider } from '../../packages/shared/src/types';
import { KakaoWaitingProviderAdapter } from './waiting-providers';

dotenv.config({ path: '.env.local' });

interface ShopWaitingTargetRow {
  id: string;
  name: string;
  address: string;
  kakao_place_id: string | null;
  kakao_place_url: string | null;
}

interface CliOptions {
  dryRun: boolean;
  confirmLive: boolean;
  missingOnly: boolean;
  headful: boolean;
  help: boolean;
  limit?: number;
  delayMs: number;
  reportDir: string;
}

interface ClassifiedWaitingSystem {
  shopId: string;
  shopName: string;
  address: string;
  provider: WaitingProvider;
  providerUrl?: string;
  confidence: number;
  status: 'detected' | 'unknown' | 'failed';
  reason: string;
  checkedAt: string;
}

interface CrawlSummary {
  scanned: number;
  detected: number;
  unknown: number;
  updated: number;
  skipped: number;
  failed: number;
}

function readOptionValue(args: string[], name: string): string | undefined {
  const equalPrefix = `${name}=`;
  const equalArg = args.find((arg) => arg.startsWith(equalPrefix));

  if (equalArg) {
    return equalArg.slice(equalPrefix.length);
  }

  const index = args.indexOf(name);
  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
}

function parseNumberOption(
  args: string[],
  name: string,
  defaultValue?: number
): number | undefined {
  const value = readOptionValue(args, name);

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} 옵션은 0 이상의 숫자여야 합니다.`);
  }

  return parsed;
}

function parseCliOptions(args = process.argv.slice(2)): CliOptions {
  const confirmLive = args.includes('--confirm-live');
  const delayMs = parseNumberOption(args, '--delay-ms', 1500);
  const limit = parseNumberOption(args, '--limit');
  const reportDir = readOptionValue(args, '--report-dir') || 'reports/crawling';

  return {
    dryRun: args.includes('--dry-run') || !confirmLive,
    confirmLive,
    missingOnly: args.includes('--missing-only'),
    headful: args.includes('--headful'),
    help: args.includes('--help') || args.includes('-h'),
    limit,
    delayMs: delayMs ?? 1500,
    reportDir,
  };
}

function printHelp(): void {
  console.log(`
📖 Shop 웨이팅 시스템 식별 사용법

사용법:
  pnpm crawl:waiting-systems [옵션]

옵션:
  --confirm-live         DB에 식별 결과를 저장합니다. 없으면 항상 DRY-RUN입니다.
  --dry-run              DB 업데이트 없이 식별/리포트만 생성
  --limit <number>       처리할 Shop 최대 개수
  --delay-ms <number>    Kakao 상세 페이지 요청 간 지연 (기본값: 1500)
  --missing-only         shop_waiting_systems 결과가 없는 Shop만 처리
  --headful              Puppeteer 브라우저를 화면에 표시
  --report-dir <path>    리포트 저장 경로 (기본값: reports/crawling)
  --help, -h             도움말 출력

환경 변수:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY

예시:
  pnpm crawl:waiting-systems -- --limit 10
  pnpm crawl:waiting-systems -- --confirm-live --limit 50
`);
}

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase 환경 변수가 필요합니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

function buildKakaoPlaceUrl(shop: ShopWaitingTargetRow): string | undefined {
  if (shop.kakao_place_url) {
    return shop.kakao_place_url;
  }

  if (shop.kakao_place_id) {
    return `https://place.map.kakao.com/${shop.kakao_place_id}`;
  }

  return undefined;
}

async function fetchTargetShops(
  supabase: SupabaseClient,
  options: CliOptions
): Promise<ShopWaitingTargetRow[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, address, kakao_place_id, kakao_place_url')
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  let shops = (data || []) as ShopWaitingTargetRow[];

  if (options.missingOnly) {
    const { data: existingRows, error: existingError } = await supabase
      .from('shop_waiting_systems')
      .select('shop_id');

    if (existingError) {
      throw existingError;
    }

    const existingShopIds = new Set(
      ((existingRows || []) as Array<{ shop_id: string }>).map(
        (row) => row.shop_id
      )
    );
    shops = shops.filter((shop) => !existingShopIds.has(shop.id));
  }

  if (options.limit !== undefined) {
    shops = shops.slice(0, options.limit);
  }

  return shops;
}

function toClassifiedWaitingSystem(
  shop: ShopWaitingTargetRow,
  result: {
    provider: WaitingProvider;
    providerUrl?: string;
    confidence: number;
    status: 'detected' | 'unknown' | 'failed';
    reason: string;
  }
): ClassifiedWaitingSystem {
  return {
    shopId: shop.id,
    shopName: shop.name,
    address: shop.address,
    provider: result.provider,
    providerUrl: result.providerUrl,
    confidence: result.confidence,
    status: result.status,
    reason: result.reason,
    checkedAt: new Date().toISOString(),
  };
}

function escapeCsvValue(value: string | number | undefined): string {
  if (value === undefined) {
    return '';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

function toCsv(results: ClassifiedWaitingSystem[]): string {
  const header = [
    'shopId',
    'shopName',
    'address',
    'provider',
    'providerUrl',
    'confidence',
    'status',
    'reason',
    'checkedAt',
  ];
  const rows = results.map((result) =>
    [
      result.shopId,
      result.shopName,
      result.address,
      result.provider,
      result.providerUrl,
      result.confidence,
      result.status,
      result.reason,
      result.checkedAt,
    ]
      .map(escapeCsvValue)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

async function writeReports(
  reportDir: string,
  results: ClassifiedWaitingSystem[],
  summary: CrawlSummary
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(
    process.cwd(),
    reportDir,
    `waiting-systems-${timestamp}`
  );

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(outputDir, 'shop-waiting-systems.json'),
      `${JSON.stringify(results, null, 2)}\n`
    ),
    writeFile(
      path.join(outputDir, 'shop-waiting-systems.csv'),
      `${toCsv(results)}\n`
    ),
    writeFile(
      path.join(outputDir, 'summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`
    ),
  ]);

  console.log(`\n📁 리포트 저장 완료: ${outputDir}`);
}

async function upsertWaitingSystem(
  supabase: SupabaseClient,
  result: ClassifiedWaitingSystem
): Promise<void> {
  const { error } = await supabase.from('shop_waiting_systems').upsert(
    {
      shop_id: result.shopId,
      provider: result.provider,
      provider_url: result.providerUrl ?? null,
    },
    { onConflict: 'shop_id' }
  );

  if (error) {
    throw error;
  }
}

async function crawlWaitingSystems(options: CliOptions): Promise<void> {
  const supabase = createSupabaseClient();
  const shops = await fetchTargetShops(supabase, options);

  console.log('\n⏳ Shop 웨이팅 시스템 식별 시작');
  console.log(`   - 대상 Shop: ${shops.length}개`);
  console.log(`   - 실행 모드: ${options.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(
    `   - 처리 범위: ${options.missingOnly ? '식별 결과 누락 Shop만' : '전체 Shop'}`
  );
  console.log('   - 수집 범위: provider 메타데이터만, 실시간 대기 데이터 제외');
  console.log(`   - 요청 지연: ${options.delayMs}ms\n`);

  const adapter = new KakaoWaitingProviderAdapter(
    options.delayMs,
    !options.headful
  );
  const results: ClassifiedWaitingSystem[] = [];
  const summary: CrawlSummary = {
    scanned: shops.length,
    detected: 0,
    unknown: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      const kakaoPlaceUrl = buildKakaoPlaceUrl(shop);

      console.log(`[${i + 1}/${shops.length}] ${shop.name}`);

      if (!kakaoPlaceUrl) {
        const result = toClassifiedWaitingSystem(shop, {
          provider: 'unknown',
          confidence: 0,
          status: 'unknown',
          reason: 'missing_kakao_place_url',
        });

        results.push(result);
        summary.unknown++;
        summary.skipped++;

        if (!options.dryRun) {
          await upsertWaitingSystem(supabase, result);
          summary.updated++;
        }

        console.log(
          '  ⚠️  Kakao Place URL/ID가 없어 unknown으로 기록합니다.\n'
        );
        continue;
      }

      try {
        const detection = await adapter.identify(kakaoPlaceUrl);
        const result = toClassifiedWaitingSystem(shop, {
          provider: detection.provider,
          providerUrl: detection.providerUrl,
          confidence: detection.confidence,
          status: detection.status,
          reason: detection.reason,
        });

        results.push(result);

        if (result.provider === 'unknown') {
          summary.unknown++;
          console.log('  ℹ️  웨이팅 provider 미확인\n');
        } else {
          summary.detected++;
          console.log(
            `  ✅ provider: ${result.provider} (${result.confidence})\n`
          );
        }

        if (options.dryRun) {
          continue;
        }

        await upsertWaitingSystem(supabase, result);
        summary.updated++;
      } catch (error) {
        summary.failed++;

        const result = toClassifiedWaitingSystem(shop, {
          provider: 'unknown',
          confidence: 0,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'failed',
        });

        results.push(result);
        console.log(
          `  ❌ 처리 실패: ${error instanceof Error ? error.message : String(error)}\n`
        );

        if (!options.dryRun) {
          await upsertWaitingSystem(supabase, result);
          summary.updated++;
        }
      }
    }
  } finally {
    await adapter.closeBrowser();
  }

  await writeReports(options.reportDir, results, summary);

  console.log('\n' + '='.repeat(60));
  console.log('📊 웨이팅 시스템 식별 요약');
  console.log('='.repeat(60));
  console.log(`📋 처리 대상: ${summary.scanned}개`);
  console.log(`✅ provider 식별: ${summary.detected}개`);
  console.log(`ℹ️  unknown: ${summary.unknown}개`);
  console.log(`💾 DB 업데이트: ${summary.updated}개`);
  console.log(`⏭️  건너뜀: ${summary.skipped}개`);
  console.log(`❌ 실패: ${summary.failed}개`);
  console.log('='.repeat(60));
}

async function main(): Promise<void> {
  const options = parseCliOptions();

  if (options.help) {
    printHelp();
    return;
  }

  await crawlWaitingSystems(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
}

export { buildKakaoPlaceUrl, crawlWaitingSystems, parseCliOptions, toCsv };
