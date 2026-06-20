#!/usr/bin/env node

/**
 * Catchtable 검색 화면에서 추출한 Shop 링크를 Ramap DB Shop과 매칭해
 * shop_waiting_systems provider 메타데이터로 반영합니다.
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const DEFAULT_INPUT = 'data/catchtable-shops.json';
const DEFAULT_REPORT_DIR = 'reports/crawling';
const DEFAULT_MIN_CONFIDENCE = 0.85;
const AMBIGUOUS_SCORE_GAP = 0.08;

interface CatchtableInputShop {
  name: string;
  url: string;
  address?: string;
}

interface ShopRow {
  id: string;
  name: string;
  address: string;
}

interface CliOptions {
  input: string;
  dryRun: boolean;
  confirmLive: boolean;
  minConfidence: number;
  reportDir: string;
  help: boolean;
}

interface MatchCandidate {
  shopId: string;
  shopName: string;
  shopAddress: string;
  confidence: number;
  reason: string;
}

interface ImportResultBase {
  inputName: string;
  inputUrl: string;
  inputAddress?: string;
}

interface MatchedResult extends ImportResultBase {
  shopId: string;
  shopName: string;
  shopAddress: string;
  provider: 'catchtable';
  providerUrl: string;
  status: 'detected';
  confidence: number;
  reason: string;
  checkedAt: string;
}

interface ReviewResult extends ImportResultBase {
  reason: string;
  candidates: MatchCandidate[];
}

interface ImportSummary {
  input: string;
  dryRun: boolean;
  minConfidence: number;
  totalInput: number;
  validInput: number;
  matched: number;
  needsReview: number;
  unmatched: number;
  updated: number;
  failed: number;
  reportDir: string;
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

function parseCliOptions(args = process.argv.slice(2)): CliOptions {
  const confirmLive = args.includes('--confirm-live');
  const minConfidenceValue = readOptionValue(args, '--min-confidence');
  const minConfidence =
    minConfidenceValue === undefined
      ? DEFAULT_MIN_CONFIDENCE
      : Number.parseFloat(minConfidenceValue);

  if (
    !Number.isFinite(minConfidence) ||
    minConfidence < 0 ||
    minConfidence > 1
  ) {
    throw new Error('--min-confidence 옵션은 0 이상 1 이하 숫자여야 합니다.');
  }

  return {
    input: readOptionValue(args, '--input') || DEFAULT_INPUT,
    dryRun: args.includes('--dry-run') || !confirmLive,
    confirmLive,
    minConfidence,
    reportDir: readOptionValue(args, '--report-dir') || DEFAULT_REPORT_DIR,
    help: args.includes('--help') || args.includes('-h'),
  };
}

function printHelp(): void {
  console.log(`
📖 Catchtable 링크 가져오기 사용법

사용법:
  pnpm import:catchtable-links [옵션]

옵션:
  --input <path>           입력 JSON 파일 경로 (기본값: data/catchtable-shops.json)
  --confirm-live           매칭된 결과를 shop_waiting_systems에 저장합니다. 없으면 DRY-RUN입니다.
  --dry-run                DB 업데이트 없이 매칭/리포트만 생성
  --min-confidence <0-1>   자동 매칭 최소 신뢰도 (기본값: 0.85)
  --report-dir <path>      리포트 저장 경로 (기본값: reports/crawling)
  --help, -h               도움말 출력

입력 JSON:
  [{ "name": "Shop 이름", "url": "https://app.catchtable.co.kr/...", "address": "선택" }]
  { "shops": [{ "name": "Shop 이름", "url": "https://app.catchtable.co.kr/..." }] }

예시:
  pnpm import:catchtable-links
  pnpm import:catchtable-links -- --input data/catchtable-shops.json --confirm-live
`);
}

function createSupabaseClient(options: CliOptions): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKey =
    serviceRoleKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase 환경 변수가 필요합니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.'
    );
  }

  if (!options.dryRun && !serviceRoleKey) {
    throw new Error('LIVE 반영에는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseInputShop(value: unknown, index: number): CatchtableInputShop {
  if (!isRecord(value)) {
    throw new Error(`입력 ${index + 1}번째 항목은 객체여야 합니다.`);
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    throw new Error(`입력 ${index + 1}번째 항목의 name이 필요합니다.`);
  }

  if (typeof value.url !== 'string' || value.url.trim().length === 0) {
    throw new Error(`입력 ${index + 1}번째 항목의 url이 필요합니다.`);
  }

  const url = normalizeCatchtableUrl(value.url);
  if (!url) {
    throw new Error(
      `입력 ${index + 1}번째 항목의 url은 Catchtable shop URL이어야 합니다.`
    );
  }

  return {
    name: value.name.trim(),
    url,
    address:
      typeof value.address === 'string' && value.address.trim().length > 0
        ? value.address.trim()
        : undefined,
  };
}

function normalizeCatchtableUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname !== 'app.catchtable.co.kr' ||
      !parsed.pathname.startsWith('/ct/shop/')
    ) {
      return undefined;
    }

    parsed.protocol = 'https:';
    parsed.hash = '';
    return parsed.toString();
  } catch (error) {
    return undefined;
  }
}

async function readInputShops(
  inputPath: string
): Promise<CatchtableInputShop[]> {
  const raw = await readFile(path.resolve(process.cwd(), inputPath), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const shops = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.shops)
      ? parsed.shops
      : undefined;

  if (!shops) {
    throw new Error(
      '입력 JSON은 배열 또는 { "shops": [...] } 형태여야 합니다.'
    );
  }

  return shops.map(parseInputShop);
}

async function fetchShops(supabase: SupabaseClient): Promise<ShopRow[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, address')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as ShopRow[];
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*]/g, '')
    .replace(/본점|직영점|분점|지점|점$/g, '')
    .replace(/라멘|라면|ramen|らーめん|ラーメン/g, '')
    .replace(/[^0-9a-z가-힣ぁ-んァ-ヶ一-龠]/g, '');
}

function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\([^)]*\)/g, '')
    .replace(
      /대한민국|서울특별시|서울시|부산광역시|부산시|대구광역시|대구시/g,
      ''
    )
    .replace(/[^0-9a-z가-힣]/g, '');
}

function makeBigrams(value: string): Set<string> {
  if (value.length < 2) {
    return new Set(value ? [value] : []);
  }

  const bigrams = new Set<string>();
  for (let i = 0; i < value.length - 1; i++) {
    bigrams.add(value.slice(i, i + 2));
  }
  return bigrams;
}

function diceSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = makeBigrams(left);
  const rightBigrams = makeBigrams(right);
  let intersection = 0;

  leftBigrams.forEach((bigram) => {
    if (rightBigrams.has(bigram)) {
      intersection++;
    }
  });

  return (2 * intersection) / (leftBigrams.size + rightBigrams.size);
}

function scoreAddress(
  inputAddress: string | undefined,
  shopAddress: string
): number {
  if (!inputAddress) {
    return 0;
  }

  const normalizedInput = normalizeAddress(inputAddress);
  const normalizedShop = normalizeAddress(shopAddress);

  if (!normalizedInput || !normalizedShop) {
    return 0;
  }

  if (normalizedInput === normalizedShop) {
    return 0.08;
  }

  if (
    normalizedInput.includes(normalizedShop) ||
    normalizedShop.includes(normalizedInput)
  ) {
    return 0.06;
  }

  const inputTokens =
    normalizedInput.match(/[가-힣]+구|[가-힣]+동|[0-9]+/g) || [];
  const shopTokens = new Set(
    normalizedShop.match(/[가-힣]+구|[가-힣]+동|[0-9]+/g) || []
  );
  const sharedTokens = inputTokens.filter((token) => shopTokens.has(token));

  return sharedTokens.length > 0 ? 0.03 : 0;
}

function scoreMatch(
  inputShop: CatchtableInputShop,
  shop: ShopRow
): MatchCandidate {
  const inputName = normalizeName(inputShop.name);
  const shopName = normalizeName(shop.name);
  let nameScore = 0;
  let reason = 'name_similarity';

  if (inputName && shopName && inputName === shopName) {
    nameScore = 0.92;
    reason = 'name_exact';
  } else if (
    inputName &&
    shopName &&
    (inputName.includes(shopName) || shopName.includes(inputName))
  ) {
    nameScore = 0.78;
    reason = 'name_contains';
  } else {
    const similarity = diceSimilarity(inputName, shopName);
    nameScore =
      similarity >= 0.62 ? 0.55 + similarity * 0.25 : similarity * 0.5;
  }

  const addressScore = scoreAddress(inputShop.address, shop.address);
  const confidence = Math.min(1, Number((nameScore + addressScore).toFixed(2)));

  return {
    shopId: shop.id,
    shopName: shop.name,
    shopAddress: shop.address,
    confidence,
    reason: addressScore > 0 ? `${reason}+address` : reason,
  };
}

function findMatch(
  inputShop: CatchtableInputShop,
  shops: ShopRow[],
  minConfidence: number
): { matched?: MatchCandidate; needsReview?: MatchCandidate[] } {
  const candidates = shops
    .map((shop) => scoreMatch(inputShop, shop))
    .filter((candidate) => candidate.confidence > 0)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);

  const [best, second] = candidates;

  if (!best) {
    return {};
  }

  if (best.confidence < minConfidence) {
    return { needsReview: candidates };
  }

  if (second && best.confidence - second.confidence < AMBIGUOUS_SCORE_GAP) {
    return { needsReview: candidates };
  }

  return { matched: best };
}

function escapeCsvValue(value: string | number | undefined): string {
  if (value === undefined) {
    return '';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

function toMatchedCsv(results: MatchedResult[]): string {
  const header = [
    'inputName',
    'inputUrl',
    'inputAddress',
    'shopId',
    'shopName',
    'shopAddress',
    'provider',
    'providerUrl',
    'status',
    'confidence',
    'reason',
    'checkedAt',
  ];
  const rows = results.map((result) =>
    [
      result.inputName,
      result.inputUrl,
      result.inputAddress,
      result.shopId,
      result.shopName,
      result.shopAddress,
      result.provider,
      result.providerUrl,
      result.status,
      result.confidence,
      result.reason,
      result.checkedAt,
    ]
      .map(escapeCsvValue)
      .join(',')
  );

  return [header.join(','), ...rows].join('\n');
}

function toReviewCsv(results: ReviewResult[]): string {
  const header = [
    'inputName',
    'inputUrl',
    'inputAddress',
    'reason',
    'candidateShopId',
    'candidateShopName',
    'candidateShopAddress',
    'candidateConfidence',
    'candidateReason',
  ];
  const rows = results.flatMap((result) => {
    if (result.candidates.length === 0) {
      return [
        [
          result.inputName,
          result.inputUrl,
          result.inputAddress,
          result.reason,
          '',
          '',
          '',
          '',
          '',
        ]
          .map(escapeCsvValue)
          .join(','),
      ];
    }

    return result.candidates.map((candidate) =>
      [
        result.inputName,
        result.inputUrl,
        result.inputAddress,
        result.reason,
        candidate.shopId,
        candidate.shopName,
        candidate.shopAddress,
        candidate.confidence,
        candidate.reason,
      ]
        .map(escapeCsvValue)
        .join(',')
    );
  });

  return [header.join(','), ...rows].join('\n');
}

async function writeJsonAndCsv<T>(
  outputDir: string,
  basename: string,
  rows: T[],
  csv: string
): Promise<void> {
  await Promise.all([
    writeFile(
      path.join(outputDir, `${basename}.json`),
      `${JSON.stringify(rows, null, 2)}\n`
    ),
    writeFile(path.join(outputDir, `${basename}.csv`), `${csv}\n`),
  ]);
}

async function writeReports(
  reportDir: string,
  matched: MatchedResult[],
  needsReview: ReviewResult[],
  unmatched: ReviewResult[],
  summary: ImportSummary
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(
    process.cwd(),
    reportDir,
    `catchtable-import-${timestamp}`
  );

  summary.reportDir = outputDir;

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeJsonAndCsv(outputDir, 'matched', matched, toMatchedCsv(matched)),
    writeJsonAndCsv(
      outputDir,
      'needs-review',
      needsReview,
      toReviewCsv(needsReview)
    ),
    writeJsonAndCsv(outputDir, 'unmatched', unmatched, toReviewCsv(unmatched)),
    writeFile(
      path.join(outputDir, 'summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`
    ),
  ]);

  return outputDir;
}

async function upsertCatchtableWaitingSystem(
  supabase: SupabaseClient,
  result: MatchedResult
): Promise<void> {
  const { error } = await supabase.from('shop_waiting_systems').upsert(
    {
      shop_id: result.shopId,
      provider: 'catchtable',
      provider_url: result.providerUrl,
    },
    { onConflict: 'shop_id' }
  );

  if (error) {
    throw error;
  }
}

async function importCatchtableLinks(options: CliOptions): Promise<void> {
  const supabase = createSupabaseClient(options);
  const [inputShops, dbShops] = await Promise.all([
    readInputShops(options.input),
    fetchShops(supabase),
  ]);
  const matched: MatchedResult[] = [];
  const needsReview: ReviewResult[] = [];
  const unmatched: ReviewResult[] = [];
  const summary: ImportSummary = {
    input: path.resolve(process.cwd(), options.input),
    dryRun: options.dryRun,
    minConfidence: options.minConfidence,
    totalInput: inputShops.length,
    validInput: inputShops.length,
    matched: 0,
    needsReview: 0,
    unmatched: 0,
    updated: 0,
    failed: 0,
    reportDir: '',
  };

  console.log('\n⏳ Catchtable 링크 가져오기 시작');
  console.log(`   - 입력 Shop: ${inputShops.length}개`);
  console.log(`   - DB Shop: ${dbShops.length}개`);
  console.log(`   - 실행 모드: ${options.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`   - 자동 매칭 최소 신뢰도: ${options.minConfidence}\n`);

  for (const inputShop of inputShops) {
    const matchResult = findMatch(inputShop, dbShops, options.minConfidence);

    if (matchResult.matched) {
      const checkedAt = new Date().toISOString();
      const result: MatchedResult = {
        inputName: inputShop.name,
        inputUrl: inputShop.url,
        inputAddress: inputShop.address,
        shopId: matchResult.matched.shopId,
        shopName: matchResult.matched.shopName,
        shopAddress: matchResult.matched.shopAddress,
        provider: 'catchtable',
        providerUrl: inputShop.url,
        status: 'detected',
        confidence: matchResult.matched.confidence,
        reason: matchResult.matched.reason,
        checkedAt,
      };

      matched.push(result);
      summary.matched++;

      if (!options.dryRun) {
        try {
          await upsertCatchtableWaitingSystem(supabase, result);
          summary.updated++;
        } catch (error) {
          summary.failed++;
          console.error(
            `  ❌ DB 반영 실패 (${inputShop.name}): ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      continue;
    }

    if (matchResult.needsReview && matchResult.needsReview.length > 0) {
      needsReview.push({
        inputName: inputShop.name,
        inputUrl: inputShop.url,
        inputAddress: inputShop.address,
        reason: 'ambiguous_or_below_threshold',
        candidates: matchResult.needsReview,
      });
      summary.needsReview++;
      continue;
    }

    unmatched.push({
      inputName: inputShop.name,
      inputUrl: inputShop.url,
      inputAddress: inputShop.address,
      reason: 'no_candidate',
      candidates: [],
    });
    summary.unmatched++;
  }

  const outputDir = await writeReports(
    options.reportDir,
    matched,
    needsReview,
    unmatched,
    summary
  );

  console.log('\n' + '='.repeat(60));
  console.log('📊 Catchtable 링크 가져오기 요약');
  console.log('='.repeat(60));
  console.log(`📋 입력: ${summary.totalInput}개`);
  console.log(`✅ 자동 매칭: ${summary.matched}개`);
  console.log(`⚠️  검토 필요: ${summary.needsReview}개`);
  console.log(`ℹ️  미매칭: ${summary.unmatched}개`);
  console.log(`💾 DB 업데이트: ${summary.updated}개`);
  console.log(`❌ 실패: ${summary.failed}개`);
  console.log(`📁 리포트: ${outputDir}`);
  console.log('='.repeat(60));
}

async function main(): Promise<void> {
  const options = parseCliOptions();

  if (options.help) {
    printHelp();
    return;
  }

  await importCatchtableLinks(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
}

export {
  diceSimilarity,
  findMatch,
  importCatchtableLinks,
  normalizeAddress,
  normalizeName,
  parseCliOptions,
  normalizeCatchtableUrl,
};
