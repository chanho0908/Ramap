// Shop types
export interface Location {
  lat: number;
  lng: number;
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
  createdAt: string;
  updatedAt: string;
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
