/**
 * Shop API 함수
 */

import { supabase } from './supabase';
import type { Shop, Location } from '../types';
import { getBoundingBox } from '../utils/location';

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
  try {
    // Bounding box 계산 (간단한 방식, PostGIS 불필요)
    const box = getBoundingBox(location, radiusKm);

    // Supabase 쿼리
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .gte('lat', box.minLat)
      .lte('lat', box.maxLat)
      .gte('lng', box.minLng)
      .lte('lng', box.maxLng)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchNearbyShops Error]', error);
      throw new Error(`가게 데이터를 가져올 수 없습니다: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // snake_case → camelCase 변환 및 타입 매핑
    const shops: Shop[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      location: {
        lat: row.lat,
        lng: row.lng,
      },
      description: row.description || '',
      phone: row.phone || undefined,
      businessHours: row.business_hours || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return shops;
  } catch (error) {
    console.error('[fetchNearbyShops Error]', error);
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

    // snake_case → camelCase 변환
    const shop: Shop = {
      id: data.id,
      name: data.name,
      address: data.address,
      location: {
        lat: data.lat,
        lng: data.lng,
      },
      description: data.description || '',
      phone: data.phone || undefined,
      businessHours: data.business_hours || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return shop;
  } catch (error) {
    console.error('[fetchShopById Error]', error);
    return null;
  }
}
