/**
 * Shop API 함수
 */

import { supabase } from './supabase';
import type { Shop, Location, MapBounds, ShopRow } from '../types';
import { mapShopRowToShop } from '../mappers/shop';
import { getBoundingBox } from '../utils/location';

async function fetchShopsInBounds(
  bounds: MapBounds,
  logContext: string
): Promise<Shop[]> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
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
