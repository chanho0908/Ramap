/**
 * 위치 관련 유틸리티 함수
 */

import type { Location } from '../types';

/**
 * 두 좌표 간 거리 계산 (Haversine formula)
 *
 * @param from 시작 위치
 * @param to 도착 위치
 * @returns 거리 (km)
 *
 * @example
 * ```ts
 * const seoul = { lat: 37.5665, lng: 126.9780 };
 * const busan = { lat: 35.1796, lng: 129.0756 };
 * const distance = calculateDistance(seoul, busan); // ~325km
 * ```
 */
export function calculateDistance(from: Location, to: Location): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * 각도를 라디안으로 변환
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Bounding box 계산
 *
 * @param center 중심 위치
 * @param radiusKm 반경 (km)
 * @returns 경계 박스 { minLat, maxLat, minLng, maxLng }
 *
 * @example
 * ```ts
 * const center = { lat: 37.5665, lng: 126.9780 };
 * const box = getBoundingBox(center, 5); // 5km 반경
 * // { minLat: 37.5215, maxLat: 37.6115, minLng: 126.9186, maxLng: 127.0374 }
 * ```
 */
export function getBoundingBox(
  center: Location,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  // 위도 1도 ≈ 111km
  // 경도 1도 ≈ 111km * cos(위도)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(toRad(center.lat)));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
