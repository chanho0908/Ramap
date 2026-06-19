import type { Shop } from '../types';
import { getMenuCategoryLabel } from '../constants/menu-categories';

export type ShopSearchMatchedField =
  | 'name'
  | 'address'
  | 'phone'
  | 'businessHours'
  | 'menuCategoryIds';

export interface ShopSearchCriteria {
  query?: string;
  menuCategoryIds?: string[];
}

export interface ShopSearchResult {
  shop: Shop;
  score: number;
  matchedFields: ShopSearchMatchedField[];
}

const SHOP_SEARCH_SCORES = {
  nameExact: 100,
  namePrefix: 80,
  nameIncludes: 60,
  menuCategoryLabel: 45,
  secondaryField: 25,
} as const;

export function normalizeShopSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePhoneDigits(value: string | undefined): string {
  return value?.replace(/\D/g, '') ?? '';
}

function getLegacySearchableText(shop: Shop): string {
  return [shop.name, shop.address, shop.phone, shop.businessHours]
    .filter(Boolean)
    .join(' ');
}

function addMatchedField(
  matchedFields: ShopSearchMatchedField[],
  field: ShopSearchMatchedField
): void {
  if (!matchedFields.includes(field)) {
    matchedFields.push(field);
  }
}

function scoreShopByQuery(
  shop: Shop,
  normalizedQuery: string
): Pick<ShopSearchResult, 'score' | 'matchedFields'> | null {
  if (!normalizedQuery) {
    return {
      score: 0,
      matchedFields: [],
    };
  }

  let score = 0;
  const matchedFields: ShopSearchMatchedField[] = [];
  const normalizedName = normalizeShopSearchQuery(shop.name);

  if (normalizedName === normalizedQuery) {
    score = SHOP_SEARCH_SCORES.nameExact;
    addMatchedField(matchedFields, 'name');
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score = SHOP_SEARCH_SCORES.namePrefix;
    addMatchedField(matchedFields, 'name');
  } else if (normalizedName.includes(normalizedQuery)) {
    score = SHOP_SEARCH_SCORES.nameIncludes;
    addMatchedField(matchedFields, 'name');
  }

  const menuSearchTerms = shop.menuCategoryIds.flatMap((categoryId) => [
    normalizeShopSearchQuery(categoryId),
    normalizeShopSearchQuery(getMenuCategoryLabel(categoryId)),
  ]);

  if (menuSearchTerms.some((term) => term.includes(normalizedQuery))) {
    score = Math.max(score, SHOP_SEARCH_SCORES.menuCategoryLabel);
    addMatchedField(matchedFields, 'menuCategoryIds');
  }

  const secondaryFields: Array<[ShopSearchMatchedField, string | undefined]> = [
    ['address', shop.address],
    ['phone', shop.phone],
    ['businessHours', shop.businessHours],
  ];

  for (const [field, value] of secondaryFields) {
    if (value && normalizeShopSearchQuery(value).includes(normalizedQuery)) {
      score = Math.max(score, SHOP_SEARCH_SCORES.secondaryField);
      addMatchedField(matchedFields, field);
    }
  }

  const queryDigits = normalizePhoneDigits(normalizedQuery);
  if (queryDigits && normalizePhoneDigits(shop.phone).includes(queryDigits)) {
    score = Math.max(score, SHOP_SEARCH_SCORES.secondaryField);
    addMatchedField(matchedFields, 'phone');
  }

  if (
    matchedFields.length === 0 &&
    normalizeShopSearchQuery(getLegacySearchableText(shop)).includes(
      normalizedQuery
    )
  ) {
    score = Math.max(score, SHOP_SEARCH_SCORES.secondaryField);
    addMatchedField(matchedFields, 'name');
    addMatchedField(matchedFields, 'address');
  }

  if (matchedFields.length === 0) {
    return null;
  }

  return {
    score,
    matchedFields,
  };
}

function matchesMenuCategoryFilter(
  shop: Shop,
  menuCategoryIds: string[] | undefined
): boolean {
  if (!menuCategoryIds || menuCategoryIds.length === 0) {
    return true;
  }

  return menuCategoryIds.some((categoryId) =>
    shop.menuCategoryIds.includes(categoryId)
  );
}

export function searchShops(
  shops: Shop[],
  criteria: ShopSearchCriteria
): ShopSearchResult[] {
  const normalizedQuery = normalizeShopSearchQuery(criteria.query ?? '');

  return shops
    .map((shop, index) => {
      if (!matchesMenuCategoryFilter(shop, criteria.menuCategoryIds)) {
        return null;
      }

      const searchMeta = scoreShopByQuery(shop, normalizedQuery);
      if (!searchMeta) {
        return null;
      }

      return {
        ...searchMeta,
        shop,
        index,
      };
    })
    .filter(
      (
        result
      ): result is ShopSearchResult & {
        index: number;
      } => result !== null
    )
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ index: _index, ...result }) => result);
}

export function filterShopsByQuery(shops: Shop[], query: string): Shop[] {
  const normalizedQuery = normalizeShopSearchQuery(query);

  if (!normalizedQuery) {
    return shops;
  }

  return shops.filter((shop) => {
    const searchableText = normalizeShopSearchQuery(
      getLegacySearchableText(shop)
    );

    return searchableText.includes(normalizedQuery);
  });
}
