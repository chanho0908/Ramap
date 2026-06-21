/**
 * Shop API 함수
 */

import { supabase } from './supabase';
import type {
  Location,
  MapBounds,
  Shop,
  ShopRow,
  ShopWaitingSystem,
  ShopWaitingSystemRow,
  UpsertShopWaitingSystemParams,
} from '../types';
import { mapShopRowToShop } from '../mappers/shop';
import { mapShopWaitingSystemRowToShopWaitingSystem } from '../mappers/waiting-system';
import { getBoundingBox } from '../utils/location';
import { normalizeShopSearchQuery } from '../utils/shop-search';
import { MENU_CATEGORIES } from '../constants/menu-categories';

export interface FetchShopsBySearchCriteria {
  query: string;
  menuCategoryIds?: string[];
  limit?: number;
}

const DEFAULT_SEARCH_LIMIT = 50;
const VISIBLE_SHOP_FILTER = { column: 'is_visible', value: true } as const;
const SHOP_TEXT_SEARCH_COLUMNS = [
  'name',
  'address',
  'phone',
  'business_hours',
] as const;

type ShopTextSearchColumn = (typeof SHOP_TEXT_SEARCH_COLUMNS)[number];

function toIlikePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`;
}

function getMenuCategoryIdsBySearchQuery(query: string): string[] {
  return MENU_CATEGORIES.filter((category) => {
    const normalizedId = normalizeShopSearchQuery(category.id);
    const normalizedLabel = normalizeShopSearchQuery(category.label);

    return normalizedId.includes(query) || normalizedLabel.includes(query);
  }).map((category) => category.id);
}

function mergeShopRows(rows: ShopRow[][]): ShopRow[] {
  const merged = new Map<string, ShopRow>();

  rows.flat().forEach((row) => {
    merged.set(row.id, row);
  });

  return [...merged.values()];
}

async function fetchShopRowsByTextColumn(
  column: ShopTextSearchColumn,
  pattern: string,
  menuCategoryIds: string[] | undefined,
  limit: number
): Promise<ShopRow[]> {
  let request = supabase
    .from('shops')
    .select('*')
    .eq(VISIBLE_SHOP_FILTER.column, VISIBLE_SHOP_FILTER.value)
    .ilike(column, pattern)
    .limit(limit);

  if (menuCategoryIds && menuCategoryIds.length > 0) {
    request = request.overlaps('menu_category_ids', menuCategoryIds);
  }

  const { data, error } = await request;

  if (error) {
    console.error('[fetchShopsBySearch Error]', error);
    throw new Error(`가게 검색 결과를 가져올 수 없습니다: ${error.message}`);
  }

  return (data ?? []) as ShopRow[];
}

async function fetchShopsInBounds(
  bounds: MapBounds,
  logContext: string
): Promise<Shop[]> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq(VISIBLE_SHOP_FILTER.column, VISIBLE_SHOP_FILTER.value)
      .gte('lat', bounds.minLat)
      .lte('lat', bounds.maxLat)
      .gte('lng', bounds.minLng)
      .lte('lng', bounds.maxLng)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${logContext} Error]`, error);
      throw new Error(`가게 데이터를 가져올 수 없습니다: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return (data as ShopRow[]).map(mapShopRowToShop);
  } catch (error) {
    console.error(`[${logContext} Error]`, error);
    throw error;
  }
}

/**
 * 주변 가게 조회
 *
 * @param location 중심 위치
 * @param radiusKm 반경 (km), 기본값 5km
 * @returns 가게 목록
 *
 * @example
 * ```ts
 * const shops = await fetchNearbyShops({ lat: 37.5665, lng: 126.9780 }, 5);
 * console.log(`${shops.length}개의 가게를 찾았습니다.`);
 * ```
 */
export async function fetchNearbyShops(
  location: Location,
  radiusKm: number = 5
): Promise<Shop[]> {
  // Bounding box 계산 (간단한 방식, PostGIS 불필요)
  const box = getBoundingBox(location, radiusKm);
  return fetchShopsInBounds(box, 'fetchNearbyShops');
}

/**
 * 지도 표시 영역 기준 가게 조회
 *
 * @param bounds 지도 표시 영역의 상하좌우 좌표
 * @returns 가게 목록
 *
 * @example
 * ```ts
 * const shops = await fetchShopsByBounds({
 *   minLat: 37.5,
 *   maxLat: 37.6,
 *   minLng: 126.9,
 *   maxLng: 127.0,
 * });
 * ```
 */
export async function fetchShopsByBounds(bounds: MapBounds): Promise<Shop[]> {
  return fetchShopsInBounds(bounds, 'fetchShopsByBounds');
}

/**
 * 검색어 기준 전역 가게 조회
 *
 * @param criteria 검색어, 메뉴 카테고리 필터, 최대 조회 수
 * @returns 가게 목록
 */
export async function fetchShopsBySearch(
  criteria: FetchShopsBySearchCriteria
): Promise<Shop[]> {
  const normalizedQuery = normalizeShopSearchQuery(criteria.query);

  if (!normalizedQuery) {
    return [];
  }

  try {
    const pattern = toIlikePattern(normalizedQuery);
    const limit = criteria.limit ?? DEFAULT_SEARCH_LIMIT;
    const matchedMenuCategoryIds =
      getMenuCategoryIdsBySearchQuery(normalizedQuery);

    const rowGroups = await Promise.all(
      SHOP_TEXT_SEARCH_COLUMNS.map((column) =>
        fetchShopRowsByTextColumn(
          column,
          pattern,
          criteria.menuCategoryIds,
          limit
        )
      )
    );

    if (matchedMenuCategoryIds.length > 0) {
      let menuSearchRequest = supabase
        .from('shops')
        .select('*')
        .eq(VISIBLE_SHOP_FILTER.column, VISIBLE_SHOP_FILTER.value)
        .overlaps('menu_category_ids', matchedMenuCategoryIds)
        .limit(limit);

      if (criteria.menuCategoryIds && criteria.menuCategoryIds.length > 0) {
        menuSearchRequest = menuSearchRequest.overlaps(
          'menu_category_ids',
          criteria.menuCategoryIds
        );
      }

      const menuSearchResult = await menuSearchRequest;

      if (menuSearchResult.error) {
        console.error('[fetchShopsBySearch Error]', menuSearchResult.error);
        throw new Error(
          `가게 검색 결과를 가져올 수 없습니다: ${menuSearchResult.error.message}`
        );
      }

      rowGroups.push((menuSearchResult.data ?? []) as ShopRow[]);
    }

    const rows = mergeShopRows(rowGroups).slice(0, limit);

    if (rows.length === 0) {
      return [];
    }

    return rows.map(mapShopRowToShop);
  } catch (error) {
    console.error('[fetchShopsBySearch Error]', error);
    throw error;
  }
}

/**
 * 가게 상세 조회
 *
 * @param id 가게 ID
 * @returns 가게 정보 또는 null
 *
 * @example
 * ```ts
 * const shop = await fetchShopById('123e4567-e89b-12d3-a456-426614174000');
 * if (shop) {
 *   console.log(shop.name);
 * }
 * ```
 */
export async function fetchShopById(id: string): Promise<Shop | null> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[fetchShopById Error]', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapShopRowToShop(data as ShopRow);
  } catch (error) {
    console.error('[fetchShopById Error]', error);
    return null;
  }
}

/**
 * Shop별 웨이팅 시스템 조회
 *
 * @param shopId Shop ID
 * @returns Shop 웨이팅 시스템 정보 또는 null
 */
export async function fetchShopWaitingSystem(
  shopId: string
): Promise<ShopWaitingSystem | null> {
  try {
    const { data, error } = await supabase
      .from('shop_waiting_systems')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();

    if (error) {
      console.error('[fetchShopWaitingSystem Error]', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapShopWaitingSystemRowToShopWaitingSystem(
      data as ShopWaitingSystemRow
    );
  } catch (error) {
    console.error('[fetchShopWaitingSystem Error]', error);
    return null;
  }
}

/**
 * 여러 Shop의 웨이팅 시스템 조회
 *
 * @param shopIds Shop ID 목록
 * @returns Shop 웨이팅 시스템 정보 목록
 */
export async function fetchShopWaitingSystems(
  shopIds: string[]
): Promise<ShopWaitingSystem[]> {
  if (shopIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('shop_waiting_systems')
      .select('*')
      .in('shop_id', shopIds);

    if (error) {
      console.error('[fetchShopWaitingSystems Error]', error);
      throw new Error(
        `웨이팅 시스템 데이터를 가져올 수 없습니다: ${error.message}`
      );
    }

    return ((data || []) as ShopWaitingSystemRow[]).map(
      mapShopWaitingSystemRowToShopWaitingSystem
    );
  } catch (error) {
    console.error('[fetchShopWaitingSystems Error]', error);
    throw error;
  }
}

/**
 * Shop 웨이팅 시스템 식별 결과 저장
 *
 * 실시간 대기 데이터가 아니라 provider 메타데이터만 저장합니다.
 */
export async function upsertShopWaitingSystem(
  params: UpsertShopWaitingSystemParams
): Promise<ShopWaitingSystem> {
  const payload = {
    shop_id: params.shopId,
    provider: params.provider,
    provider_url: params.providerUrl ?? null,
  };

  const { data, error } = await supabase
    .from('shop_waiting_systems')
    .upsert(payload, { onConflict: 'shop_id' })
    .select()
    .single();

  if (error) {
    console.error('[upsertShopWaitingSystem Error]', error);
    throw new Error(
      `웨이팅 시스템 데이터를 저장할 수 없습니다: ${error.message}`
    );
  }

  return mapShopWaitingSystemRowToShopWaitingSystem(
    data as ShopWaitingSystemRow
  );
}
