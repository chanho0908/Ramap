import type { Shop, ShopRow } from '../types';

function optional<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

export function mapShopRowToShop(row: ShopRow): Shop {
  return {
    id: row.id,
    kakaoPlaceId: optional(row.kakao_place_id),
    name: row.name,
    address: row.address,
    location: {
      lat: row.lat,
      lng: row.lng,
    },
    kakaoPlaceUrl: optional(row.kakao_place_url),
    phone: optional(row.phone),
    businessHours: optional(row.business_hours),
    instagramUrl: optional(row.instagram_url),
    kakaoRating: optional(row.kakao_rating),
    menuCategoryIds: row.menu_category_ids ?? [],
    isVisible: row.is_visible ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
