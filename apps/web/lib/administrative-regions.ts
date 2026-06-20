import { normalizeShopSearchQuery } from '@ramap/shared';
import type { Location, MapBounds } from '@ramap/shared';

export interface AdministrativeRegion {
  canonicalName: string;
  aliases: string[];
  bounds: MapBounds;
  center: Location;
}

export const ADMINISTRATIVE_REGIONS: AdministrativeRegion[] = [
  {
    canonicalName: '서울특별시',
    aliases: ['서울', '서울시', '서울특별시'],
    bounds: {
      minLat: 37.413,
      maxLat: 37.715,
      minLng: 126.734,
      maxLng: 127.269,
    },
    center: { lat: 37.5665, lng: 126.978 },
  },
  {
    canonicalName: '부산광역시',
    aliases: ['부산', '부산시', '부산광역시'],
    bounds: { minLat: 34.98, maxLat: 35.4, minLng: 128.75, maxLng: 129.37 },
    center: { lat: 35.1796, lng: 129.0756 },
  },
  {
    canonicalName: '대구광역시',
    aliases: ['대구', '대구시', '대구광역시'],
    bounds: { minLat: 35.6, maxLat: 36.02, minLng: 128.35, maxLng: 128.78 },
    center: { lat: 35.8714, lng: 128.6014 },
  },
  {
    canonicalName: '인천광역시',
    aliases: ['인천', '인천시', '인천광역시'],
    bounds: { minLat: 37.0, maxLat: 37.9, minLng: 124.6, maxLng: 126.9 },
    center: { lat: 37.4563, lng: 126.7052 },
  },
  {
    canonicalName: '광주광역시',
    aliases: ['광주', '광주광역시'],
    bounds: { minLat: 35.03, maxLat: 35.25, minLng: 126.65, maxLng: 127.02 },
    center: { lat: 35.1595, lng: 126.8526 },
  },
  {
    canonicalName: '대전광역시',
    aliases: ['대전', '대전시', '대전광역시'],
    bounds: { minLat: 36.18, maxLat: 36.5, minLng: 127.25, maxLng: 127.55 },
    center: { lat: 36.3504, lng: 127.3845 },
  },
  {
    canonicalName: '울산광역시',
    aliases: ['울산', '울산시', '울산광역시'],
    bounds: { minLat: 35.32, maxLat: 35.75, minLng: 128.95, maxLng: 129.48 },
    center: { lat: 35.5384, lng: 129.3114 },
  },
  {
    canonicalName: '세종특별자치시',
    aliases: ['세종', '세종시', '세종특별자치시'],
    bounds: { minLat: 36.4, maxLat: 36.73, minLng: 127.13, maxLng: 127.39 },
    center: { lat: 36.4801, lng: 127.289 },
  },
  {
    canonicalName: '경기도',
    aliases: ['경기', '경기도'],
    bounds: { minLat: 36.89, maxLat: 38.3, minLng: 126.37, maxLng: 127.85 },
    center: { lat: 37.4138, lng: 127.5183 },
  },
  {
    canonicalName: '강원특별자치도',
    aliases: ['강원', '강원도', '강원특별자치도'],
    bounds: { minLat: 37.02, maxLat: 38.62, minLng: 127.05, maxLng: 129.37 },
    center: { lat: 37.8228, lng: 128.1555 },
  },
  {
    canonicalName: '충청북도',
    aliases: ['충북', '충청북도'],
    bounds: { minLat: 36.0, maxLat: 37.25, minLng: 127.25, maxLng: 128.75 },
    center: { lat: 36.8, lng: 127.7 },
  },
  {
    canonicalName: '충청남도',
    aliases: ['충남', '충청남도'],
    bounds: { minLat: 35.95, maxLat: 37.15, minLng: 126.1, maxLng: 127.65 },
    center: { lat: 36.5184, lng: 126.8 },
  },
  {
    canonicalName: '전북특별자치도',
    aliases: ['전북', '전라북도', '전북특별자치도'],
    bounds: { minLat: 35.3, maxLat: 36.15, minLng: 126.4, maxLng: 127.9 },
    center: { lat: 35.7175, lng: 127.153 },
  },
  {
    canonicalName: '전라남도',
    aliases: ['전남', '전라남도'],
    bounds: { minLat: 33.9, maxLat: 35.55, minLng: 125.0, maxLng: 127.8 },
    center: { lat: 34.8679, lng: 126.991 },
  },
  {
    canonicalName: '경상북도',
    aliases: ['경북', '경상북도'],
    bounds: { minLat: 35.55, maxLat: 37.6, minLng: 127.8, maxLng: 130.95 },
    center: { lat: 36.4919, lng: 128.8889 },
  },
  {
    canonicalName: '경상남도',
    aliases: ['경남', '경상남도'],
    bounds: { minLat: 34.5, maxLat: 35.95, minLng: 127.55, maxLng: 129.4 },
    center: { lat: 35.4606, lng: 128.2132 },
  },
  {
    canonicalName: '제주특별자치도',
    aliases: ['제주', '제주도', '제주특별자치도'],
    bounds: { minLat: 33.1, maxLat: 33.65, minLng: 126.1, maxLng: 126.95 },
    center: { lat: 33.4996, lng: 126.5312 },
  },
];

const REGION_BY_ALIAS = new Map(
  ADMINISTRATIVE_REGIONS.flatMap((region) =>
    region.aliases.map(
      (alias) => [normalizeRegionQuery(alias), region] as const
    )
  )
);

export function normalizeRegionQuery(query: string): string {
  return normalizeShopSearchQuery(query).replace(/\s+/g, '');
}

export function findAdministrativeRegion(
  query: string
): AdministrativeRegion | null {
  return REGION_BY_ALIAS.get(normalizeRegionQuery(query)) ?? null;
}
