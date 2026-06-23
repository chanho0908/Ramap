// Shop types
export interface Location {
  lat: number;
  lng: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Shop {
  id: string;
  kakaoPlaceId?: string;
  name: string;
  address: string;
  location: Location;
  kakaoPlaceUrl?: string;
  phone?: string;
  businessHours?: string;
  instagramUrl?: string;
  kakaoRating?: number;
  menuCategoryIds: string[];
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopRow {
  id: string;
  kakao_place_id: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kakao_place_url: string | null;
  phone: string | null;
  business_hours: string | null;
  instagram_url: string | null;
  kakao_rating: number | null;
  menu_category_ids: string[] | null;
  is_visible: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface UserShopBookmarkRow {
  user_id: string;
  shop_id: string;
  created_at: string;
}

export interface UserHiddenShopRow {
  user_id: string;
  shop_id: string;
  created_at: string;
}

export interface UserShopPersonalization {
  bookmarkedShopIds: string[];
  hiddenShopIds: string[];
}

export type WaitingProvider =
  | 'catchtable'
  | 'tabling'
  | 'syrup_friends'
  | 'unknown';

export interface ShopWaitingSystem {
  id: string;
  shopId: string;
  provider: WaitingProvider;
  providerUrl?: string;
}

export interface ShopWaitingSystemRow {
  id: string;
  shop_id: string;
  provider: WaitingProvider;
  provider_url: string | null;
}

export interface UpsertShopWaitingSystemParams {
  shopId: string;
  provider: WaitingProvider;
  providerUrl?: string;
}

// Review types
export interface Review {
  id: string;
  shopId: string;
  userId?: string;
  rating: number;
  content: string;
  photos: string[];
  createdAt: string;
}

// Checkin types
export interface Checkin {
  id: string;
  shopId: string;
  userId?: string;
  visitedAt: string;
  notes?: string;
}

// User types
export interface User {
  id: string;
  nickname: string;
  profileImage?: string;
  createdAt: string;
}

// Map marker types
export type MarkerState = 'default' | 'hover' | 'selected';

export interface MarkerConfig {
  size: {
    width: number;
    height: number;
  };
  colors: {
    default: string;
    hover: string;
    selected: string;
  };
  zIndex: {
    default: number;
    hover: number;
    selected: number;
  };
}
