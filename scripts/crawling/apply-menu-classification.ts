#!/usr/bin/env node

/**
 * Apply menu classification decisions to shops.
 *
 * This script combines Kakao menu scan output with manual review decisions.
 * Removal decisions are listed in the dry-run summary, but this script only
 * writes menu_category_ids.
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

interface ShopRow {
  id: string;
  name: string;
  address: string;
}

interface KakaoClassification {
  id: string;
  name: string;
  address: string;
  tags?: string[];
  confidence?: string;
  menus?: string[];
  raw?: string;
}

interface TagOverride {
  match: string;
  appliesTo?: string[];
  tags: string[];
}

interface ManualDecisions {
  tagOverrides: TagOverride[];
  deleteCandidates: string[];
}

interface ShopClassificationUpdate {
  shop: ShopRow;
  menuCategoryIds: string[];
  deleteCandidate: boolean;
}

interface CliOptions {
  dryRun: boolean;
  limit?: number;
  kakaoReportPath: string;
  decisionsPath: string;
}

const CATEGORY_LABEL_TO_ID: Record<string, string> = {
  돈코츠: 'tonkotsu',
  쇼유: 'shoyu',
  시오: 'shio',
  미소: 'miso',
  토리: 'tori',
  츠케멘: 'tsukemen',
  마제소바: 'mazesoba',
  아부라소바: 'aburasoba',
  지로계: 'jiro',
  '니보시/어패류': 'niboshi_gyokai',
  이에케: 'iekei',
  히야시: 'hiyashi',
  츄카소바: 'chukasoba',
  토마토라멘: 'tomato',
  insta: 'insta',
};

const AUTO_TAG_TO_ID: Record<string, string> = {
  '돈코츠/하카타/규슈': 'tonkotsu',
  '쇼유/청탕': 'shoyu',
  '시오/소금': 'shio',
  미소: 'miso',
  '토리파이탄/백탕': 'tori',
  츠케멘: 'tsukemen',
  지로계: 'jiro',
  '니보시/어패류': 'niboshi_gyokai',
  이에케: 'iekei',
  '냉라멘/히야시': 'hiyashi',
  '중화소바/츄카소바': 'chukasoba',
};

const DELETE_RULES: Array<{
  label: string;
  matches: (shop: ShopRow) => boolean;
}> = [
  exactName('마찌카도'),
  exactName('산쪼메 한양대에리카점'),
  nameAndAddress('와다라멘', '대구 북구'),
  exactName('쇼부라멘 수진점'),
  nameIncludes('큐슈울트라아멘'),
  exactName('큐슈울트라아멘&신이치 검단점'),
  exactName('이찌방라멘 카츠카레 울산남구점'),
  exactName('텐진 대구백화점 대백프라자점'),
  exactName('날라멘'),
  exactName('하쿠라멘'),
  exactName('하쿠라멘 한티점'),
  nameIncludes('고운라멘'),
  exactName('신센라멘 계양점'),
  exactName('우마미라멘 대전본점'),
  exactName('행신카츠라멘'),
  exactName('라멘티스트'),
  exactName('멘야하나비 부평역점'),
  exactName('무라라멘 해리단길점'),
  nameAndAddress('와다라멘', '경기 수원시'),
  exactName('단바쿠라멘'),
  exactName('만배식탁 광주전남대점'),
  exactName('울트라아멘'),
  exactName('산카쿠 광주본점'),
  exactName('히또시'),
  exactName('수림식당 수영점'),
];

function exactName(name: string) {
  return {
    label: name,
    matches: (shop: ShopRow) => shop.name === name,
  };
}

function nameIncludes(name: string) {
  return {
    label: `${name}*`,
    matches: (shop: ShopRow) => shop.name.includes(name),
  };
}

function nameAndAddress(name: string, addressPart: string) {
  return {
    label: `${name} @ ${addressPart}`,
    matches: (shop: ShopRow) =>
      shop.name === name && shop.address.includes(addressPart),
  };
}

function parseCliOptions(args = process.argv.slice(2)): CliOptions {
  const valueOf = (name: string) => {
    const equal = args.find((arg) => arg.startsWith(`${name}=`));
    if (equal) return equal.slice(name.length + 1);

    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const limitValue = valueOf('--limit');

  return {
    dryRun: args.includes('--dry-run'),
    limit: limitValue ? Number.parseInt(limitValue, 10) : undefined,
    kakaoReportPath:
      valueOf('--kakao-report') ||
      'reports/menu-classification/kakao-menu-classification-2026-06-18T21-54-46-211Z.json',
    decisionsPath:
      valueOf('--decisions') ||
      'reports/menu-classification/manual-review-decisions-2026-06-19.json',
  };
}

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and key are required.');
  }

  return createClient(url, key);
}

async function readJson<T>(filePath: string): Promise<T> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return JSON.parse(await readFile(absolutePath, 'utf8')) as T;
}

async function fetchShops(
  supabase: SupabaseClient,
  limit?: number
): Promise<ShopRow[]> {
  let query = supabase
    .from('shops')
    .select('id, name, address')
    .order('name', { ascending: true });

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as ShopRow[];
}

function normalizeCategoryIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

function manualTagsToIds(tags: string[]): string[] {
  return normalizeCategoryIds(
    tags.map((tag) => {
      const id = CATEGORY_LABEL_TO_ID[tag];

      if (!id) {
        throw new Error(`Unknown manual tag: ${tag}`);
      }

      return id;
    })
  );
}

function autoTagsToIds(classification?: KakaoClassification): string[] {
  if (!classification) {
    return [];
  }

  const ids: string[] = [];
  const tags = classification.tags || [];
  const menuText = [
    ...(classification.menus || []),
    classification.raw || '',
  ].join(' ');

  for (const tag of tags) {
    if (tag === '매운라멘') {
      continue;
    }

    if (tag === '마제/아부라/시루나시') {
      if (/마제/.test(menuText)) ids.push('mazesoba');
      if (/아부라|유소바|시루나시/.test(menuText)) ids.push('aburasoba');
      continue;
    }

    const id = AUTO_TAG_TO_ID[tag];
    if (id) {
      ids.push(id);
    }
  }

  if (/토마토라멘|토마토 라멘|토마토탕멘/.test(menuText)) {
    ids.push('tomato');
  }

  return normalizeCategoryIds(ids);
}

function matchesOverride(shop: ShopRow, override: TagOverride): boolean {
  if (override.appliesTo?.length) {
    return (
      shop.name === override.match &&
      override.appliesTo.some((address) => shop.address.includes(address))
    );
  }

  return shop.name === override.match;
}

function findManualOverride(
  shop: ShopRow,
  decisions: ManualDecisions
): TagOverride | undefined {
  return decisions.tagOverrides.find((override) =>
    matchesOverride(shop, override)
  );
}

function findDeleteRule(shop: ShopRow): string | undefined {
  return DELETE_RULES.find((rule) => rule.matches(shop))?.label;
}

function buildUpdates(
  shops: ShopRow[],
  kakaoClassifications: KakaoClassification[],
  decisions: ManualDecisions
): ShopClassificationUpdate[] {
  const classificationById = new Map(
    kakaoClassifications.map((classification) => [
      classification.id,
      classification,
    ])
  );

  return shops.map((shop) => {
    const deleteRule = findDeleteRule(shop);
    if (deleteRule) {
      return {
        shop,
        menuCategoryIds: [],
        deleteCandidate: true,
      };
    }

    const override = findManualOverride(shop, decisions);
    if (override) {
      return {
        shop,
        menuCategoryIds: manualTagsToIds(override.tags),
        deleteCandidate: false,
      };
    }

    const classification = classificationById.get(shop.id);
    const menuCategoryIds = autoTagsToIds(classification);

    return {
      shop,
      menuCategoryIds,
      deleteCandidate: false,
    };
  });
}

function printSummary(updates: ShopClassificationUpdate[]): void {
  const categoryCounts = new Map<string, number>();
  const deleteCandidateCount = updates.filter(
    (update) => update.deleteCandidate
  ).length;
  const unclassifiedCount = updates.filter(
    (update) => !update.deleteCandidate && update.menuCategoryIds.length === 0
  ).length;

  for (const update of updates) {
    for (const category of update.menuCategoryIds) {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
  }

  console.log('\nClassification summary');
  console.log(`  category updates: ${updates.length - deleteCandidateCount}`);
  console.log(`  delete candidates: ${deleteCandidateCount}`);
  console.log(`  unclassified: ${unclassifiedCount}`);

  console.log('\nCategory summary');
  for (const [category, count] of [...categoryCounts.entries()].sort()) {
    console.log(`  ${category}: ${count}`);
  }

  console.log('\nExcluded shops');
  updates
    .filter((update) => update.deleteCandidate)
    .forEach((update) =>
      console.log(`  - ${update.shop.name} | ${update.shop.address}`)
    );
}

async function applyUpdates(
  supabase: SupabaseClient,
  updates: ShopClassificationUpdate[]
): Promise<void> {
  const categoryUpdates = updates.filter((update) => !update.deleteCandidate);

  for (const update of categoryUpdates) {
    const { error } = await supabase
      .from('shops')
      .update({
        menu_category_ids: update.menuCategoryIds,
      })
      .eq('id', update.shop.id);

    if (error) {
      throw new Error(
        `Failed to update ${update.shop.name} (${update.shop.id}): ${error.message}`
      );
    }
  }
}

async function main() {
  const options = parseCliOptions();
  const supabase = createSupabaseClient();
  const [shops, kakaoReport, decisions] = await Promise.all([
    fetchShops(supabase, options.limit),
    readJson<{ results: KakaoClassification[] }>(options.kakaoReportPath),
    readJson<ManualDecisions>(options.decisionsPath),
  ]);

  const updates = buildUpdates(shops, kakaoReport.results, decisions);
  printSummary(updates);

  if (options.dryRun) {
    console.log('\nDRY RUN: no database updates were applied.');
    return;
  }

  await applyUpdates(supabase, updates);
  console.log(
    `\nApplied ${
      updates.filter((update) => !update.deleteCandidate).length
    } shop classification updates.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
