#!/usr/bin/env node

/**
 * Shop Instagram 정보 보강 스크립트
 *
 * Kakao Place 상세 페이지에서 Instagram 프로필 URL을 찾아 shops.instagram_url에 저장하고,
 * Instagram이 있는 매장과 없는 매장을 리포트로 분리합니다.
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KakaoDetailScraper } from './kakao-detail-scraper';

dotenv.config({ path: '.env.local' });

interface ShopInstagramRow {
  id: string;
  name: string;
  address: string;
  kakao_place_id: string | null;
  kakao_place_url: string | null;
  instagram_url: string | null;
}

interface CliOptions {
  dryRun: boolean;
  missingOnly: boolean;
  headful: boolean;
  help: boolean;
  limit?: number;
  delayMs: number;
  reportDir: string;
}

interface ClassifiedShop {
  id: string;
  name: string;
  address: string;
  kakaoPlaceUrl?: string;
  instagramUrl?: string;
  reason?: string;
}

interface CrawlSummary {
  scanned: number;
  updated: number;
  found: number;
  notFound: number;
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
  const delayMs = parseNumberOption(args, '--delay-ms', 1500);
  const limit = parseNumberOption(args, '--limit');
  const reportDir = readOptionValue(args, '--report-dir') || 'reports/crawling';

  return {
    dryRun: args.includes('--dry-run'),
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
📖 Shop Instagram 정보 크롤링 사용법

사용법:
  pnpm crawl:instagram [옵션]

옵션:
  --dry-run               DB 업데이트 없이 스크래핑/분류 리포트만 생성
  --limit <number>        처리할 Shop 최대 개수
  --delay-ms <number>     Kakao 상세 페이지 요청 간 지연 (기본값: 1500)
  --missing-only          instagram_url이 비어 있는 Shop만 처리
  --headful               Puppeteer 브라우저를 화면에 표시
  --report-dir <path>     리포트 저장 경로 (기본값: reports/crawling)
  --help, -h              도움말 출력

환경 변수:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY

예시:
  pnpm crawl:instagram:dry-run -- --limit 10
  pnpm crawl:instagram -- --limit 50 --delay-ms 2000
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

function buildKakaoPlaceUrl(shop: ShopInstagramRow): string | undefined {
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
): Promise<ShopInstagramRow[]> {
  let query = supabase
    .from('shops')
    .select('id, name, address, kakao_place_id, kakao_place_url, instagram_url')
    .order('updated_at', { ascending: true });

  if (options.missingOnly) {
    query = query.or('instagram_url.is.null,instagram_url.eq.');
  }

  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ShopInstagramRow[];
}

function toClassifiedShop(
  shop: ShopInstagramRow,
  instagramUrl?: string,
  reason?: string
): ClassifiedShop {
  return {
    id: shop.id,
    name: shop.name,
    address: shop.address,
    kakaoPlaceUrl: buildKakaoPlaceUrl(shop),
    instagramUrl,
    reason,
  };
}

function escapeCsvValue(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(shops: ClassifiedShop[]): string {
  const header = [
    'id',
    'name',
    'address',
    'kakaoPlaceUrl',
    'instagramUrl',
    'reason',
  ];
  const rows = shops.map((shop) =>
    [
      shop.id,
      shop.name,
      shop.address,
      shop.kakaoPlaceUrl,
      shop.instagramUrl,
      shop.reason,
    ]
      .map(escapeCsvValue)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

async function writeReports(
  reportDir: string,
  shopsWithInstagram: ClassifiedShop[],
  shopsWithoutInstagram: ClassifiedShop[],
  summary: CrawlSummary
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(
    process.cwd(),
    reportDir,
    `instagram-${timestamp}`
  );

  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(outputDir, 'shops-with-instagram.json'),
      `${JSON.stringify(shopsWithInstagram, null, 2)}\n`
    ),
    writeFile(
      path.join(outputDir, 'shops-without-instagram.json'),
      `${JSON.stringify(shopsWithoutInstagram, null, 2)}\n`
    ),
    writeFile(
      path.join(outputDir, 'shops-with-instagram.csv'),
      `${toCsv(shopsWithInstagram)}\n`
    ),
    writeFile(
      path.join(outputDir, 'shops-without-instagram.csv'),
      `${toCsv(shopsWithoutInstagram)}\n`
    ),
    writeFile(
      path.join(outputDir, 'summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`
    ),
  ]);

  console.log(`\n📁 리포트 저장 완료: ${outputDir}`);
}

async function updateInstagramUrl(
  supabase: SupabaseClient,
  shopId: string,
  instagramUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('shops')
    .update({ instagram_url: instagramUrl })
    .eq('id', shopId);

  if (error) {
    throw error;
  }
}

async function crawlInstagramInfo(options: CliOptions): Promise<void> {
  const supabase = createSupabaseClient();
  const shops = await fetchTargetShops(supabase, options);

  console.log('\n📸 Shop Instagram 정보 크롤링 시작');
  console.log(`   - 대상 Shop: ${shops.length}개`);
  console.log(`   - 실행 모드: ${options.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(
    `   - 처리 범위: ${options.missingOnly ? 'Instagram 누락 Shop만' : '전체 Shop'}`
  );
  console.log(`   - 요청 지연: ${options.delayMs}ms\n`);

  const scraper = new KakaoDetailScraper(options.delayMs, !options.headful);
  const shopsWithInstagram: ClassifiedShop[] = [];
  const shopsWithoutInstagram: ClassifiedShop[] = [];
  const summary: CrawlSummary = {
    scanned: shops.length,
    updated: 0,
    found: 0,
    notFound: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      const kakaoPlaceUrl = buildKakaoPlaceUrl(shop);

      console.log(`[${i + 1}/${shops.length}] ${shop.name}`);

      if (shop.instagram_url) {
        console.log(`  ✅ 기존 Instagram: ${shop.instagram_url}\n`);
        shopsWithInstagram.push(
          toClassifiedShop(shop, shop.instagram_url, 'already_exists')
        );
        summary.found++;
        summary.skipped++;
        continue;
      }

      if (!kakaoPlaceUrl) {
        console.log('  ⚠️  Kakao Place URL/ID가 없어 건너뜁니다.\n');
        shopsWithoutInstagram.push(
          toClassifiedShop(shop, undefined, 'missing_kakao_place_url')
        );
        summary.notFound++;
        summary.skipped++;
        continue;
      }

      try {
        const detail = await scraper.scrapePlaceDetails(kakaoPlaceUrl);
        const instagramUrl = detail.socialLinks.instagram;

        if (!instagramUrl) {
          shopsWithoutInstagram.push(
            toClassifiedShop(shop, undefined, 'not_found_on_kakao_place')
          );
          summary.notFound++;
          console.log('');
          continue;
        }

        shopsWithInstagram.push(
          toClassifiedShop(shop, instagramUrl, 'found_on_kakao_place')
        );
        summary.found++;

        if (options.dryRun) {
          console.log('  🧪 DRY-RUN: DB 업데이트를 건너뜁니다.\n');
          continue;
        }

        await updateInstagramUrl(supabase, shop.id, instagramUrl);
        summary.updated++;
        console.log('  💾 DB 업데이트 완료\n');
      } catch (error) {
        summary.failed++;
        shopsWithoutInstagram.push(
          toClassifiedShop(
            shop,
            undefined,
            error instanceof Error ? `failed: ${error.message}` : 'failed'
          )
        );
        console.log(
          `  ❌ 처리 실패: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    }
  } finally {
    await scraper.closeBrowser();
  }

  await writeReports(
    options.reportDir,
    shopsWithInstagram,
    shopsWithoutInstagram,
    summary
  );

  console.log('\n' + '='.repeat(60));
  console.log('📊 Instagram 크롤링 요약');
  console.log('='.repeat(60));
  console.log(`📋 처리 대상: ${summary.scanned}개`);
  console.log(`✅ Instagram 있음: ${summary.found}개`);
  console.log(`ℹ️  Instagram 없음: ${summary.notFound}개`);
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

  await crawlInstagramInfo(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
}

export { buildKakaoPlaceUrl, crawlInstagramInfo, parseCliOptions, toCsv };
