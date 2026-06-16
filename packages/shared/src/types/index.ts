// Shop types
export interface Location {
  lat: number;
  lng: number;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  location: Location;
  description?: string;
  phone?: string;
  businessHours?: string;
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
