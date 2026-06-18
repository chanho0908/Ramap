/**
 * 마커 클러스터링 유틸리티
 */

import type { Shop, Location } from '@ramap/shared';

export interface Cluster {
  id: string;
  center: Location;
  shops: Shop[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * 두 좌표 간의 거리 계산 (Haversine formula, km 단위)
 */
function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lng - loc1.lng);
  const lat1 = toRad(loc1.lat);
  const lat2 = toRad(loc2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Kakao Maps level에 따른 클러스터 거리 (km)
 * 주의: Kakao Maps는 level이 작을수록 확대된 상태
 */
function getClusterDistance(level: number): number {
  // level이 작을수록 확대 상태 → 클러스터링 덜 적극적
  if (level <= 3) return 0; // 매우 확대 - 클러스터링 안함
  if (level <= 5) return 0.2; // 200m (증가)
  if (level <= 7) return 0.6; // 600m (증가)
  if (level <= 9) return 1.0; // 1km (증가)
  if (level <= 11) return 2.0; // 2km (증가)
  return 4.0; // 4km 이상 (증가)
}

/**
 * 가게 목록을 클러스터로 그룹화
 *
 * @param shops 가게 목록
 * @param mapLevel 현재 Kakao Maps level (작을수록 확대)
 * @returns 클러스터 배열
 */
export function clusterShops(shops: Shop[], mapLevel: number): Cluster[] {
  const clusterDistance = getClusterDistance(mapLevel);

  // 클러스터링 거리가 0이면 모든 가게를 개별 클러스터로 반환
  if (clusterDistance === 0) {
    return shops.map((shop) => ({
      id: `cluster-${shop.id}`,
      center: shop.location,
      shops: [shop],
      bounds: {
        north: shop.location.lat,
        south: shop.location.lat,
        east: shop.location.lng,
        west: shop.location.lng,
      },
    }));
  }

  const clusters: Cluster[] = [];
  const processed = new Set<string>();

  shops.forEach((shop) => {
    if (processed.has(shop.id)) return;

    // 새 클러스터 생성
    const nearbyShops = [shop];
    processed.add(shop.id);

    // 가까운 가게 찾기
    shops.forEach((otherShop) => {
      if (processed.has(otherShop.id)) return;

      const distance = calculateDistance(shop.location, otherShop.location);
      if (distance <= clusterDistance) {
        nearbyShops.push(otherShop);
        processed.add(otherShop.id);
      }
    });

    // 클러스터 중심점 계산
    const centerLat =
      nearbyShops.reduce((sum, s) => sum + s.location.lat, 0) / nearbyShops.length;
    const centerLng =
      nearbyShops.reduce((sum, s) => sum + s.location.lng, 0) / nearbyShops.length;

    // 클러스터 경계 계산
    const lats = nearbyShops.map((s) => s.location.lat);
    const lngs = nearbyShops.map((s) => s.location.lng);

    clusters.push({
      id: `cluster-${shop.id}`,
      center: { lat: centerLat, lng: centerLng },
      shops: nearbyShops,
      bounds: {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      },
    });
  });

  return clusters;
}

/**
 * 클러스터가 단일 마커인지 확인
 */
export function isSingleMarker(cluster: Cluster): boolean {
  return cluster.shops.length === 1;
}

/**
 * 클러스터 크기에 따른 색상 반환
 */
export function getClusterColor(count: number): string {
  if (count < 5) return '#FF6B6B';
  if (count < 10) return '#FF8C00';
  if (count < 20) return '#FF4500';
  return '#DC143C';
}
