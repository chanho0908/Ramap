/**
 * 가게 마커 생성 유틸리티
 */

import type { Shop } from '@ramap/shared';

/**
 * Kakao Maps Marker 생성
 *
 * @param map Kakao 지도 인스턴스
 * @param shop 가게 데이터
 * @param onClick 마커 클릭 핸들러
 * @returns Kakao Marker 인스턴스
 *
 * @example
 * ```tsx
 * const marker = createShopMarker(map, shop, (shop) => {
 *   console.log('Clicked:', shop.name);
 * });
 * ```
 */
export function createShopMarker(
  map: any, // kakao.maps.Map
  shop: Shop,
  onClick: (shop: Shop) => void
): any {
  // kakao.maps.Marker
  const { kakao } = window;

  if (!kakao || !kakao.maps) {
    console.error('Kakao Maps SDK가 로드되지 않았습니다.');
    return null;
  }

  // 마커 위치 생성
  const position = new kakao.maps.LatLng(shop.location.lat, shop.location.lng);

  // 마커 생성
  const marker = new kakao.maps.Marker({
    position,
    map,
    title: shop.name,
  });

  // 클릭 이벤트 등록
  kakao.maps.event.addListener(marker, 'click', () => {
    onClick(shop);
  });

  return marker;
}

/**
 * 마커 제거
 *
 * @param marker Kakao Marker 인스턴스
 */
export function removeMarker(marker: any): void {
  if (marker && marker.setMap) {
    marker.setMap(null);
  }
}

/**
 * 여러 마커 제거
 *
 * @param markers Kakao Marker 배열
 */
export function removeMarkers(markers: any[]): void {
  markers.forEach((marker) => removeMarker(marker));
}
