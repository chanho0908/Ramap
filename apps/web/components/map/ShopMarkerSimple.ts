/**
 * 간단한 가게 마커 (기본 Kakao Marker 사용)
 */

import type { Shop } from '@ramap/shared';
import { MARKER_CONFIG } from '@ramap/shared';

/**
 * Canvas로 마커 이미지 생성 (Data URL 반환)
 */
function createMarkerImageDataURL(state: 'default' | 'hover' | 'selected'): string {
  const canvas = document.createElement('canvas');
  const size = state === 'selected' ? 44 : 40;
  canvas.width = size;
  canvas.height = size + 5; // 하단 핀을 위한 추가 공간

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 배경색 설정
  let bgColor = '#FF4444';
  if (state === 'selected') bgColor = '#FF0000';
  if (state === 'hover') bgColor = '#FF6666';

  // 원형 배경
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) - 2;

  // 그림자
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // 원 그리기
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 하단 삼각형 (핀)
  ctx.beginPath();
  ctx.moveTo(centerX, size);
  ctx.lineTo(centerX - 6, centerY + radius - 4);
  ctx.lineTo(centerX + 6, centerY + radius - 4);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.shadowBlur = 0;
  ctx.fill();

  // 라면 이모지
  ctx.shadowBlur = 0;
  ctx.font = `${size / 2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍜', centerX, centerY);

  return canvas.toDataURL();
}

/**
 * 기본 Kakao Marker로 가게 마커 생성
 */
export function createShopMarker(
  map: any,
  shop: Shop,
  onClick: (shop: Shop) => void,
  isSelected: boolean = false
): any {
  const { kakao } = window;

  if (!kakao || !kakao.maps) {
    console.error('[ShopMarker] Kakao Maps SDK가 로드되지 않았습니다.');
    return null;
  }

  try {
    // 마커 위치
    const position = new kakao.maps.LatLng(shop.location.lat, shop.location.lng);

    // Canvas로 커스텀 이미지 생성
    const imageSrc = createMarkerImageDataURL(isSelected ? 'selected' : 'default');
    const size = isSelected ? 44 : MARKER_CONFIG.size.width;
    const height = isSelected ? 49 : MARKER_CONFIG.size.height;

    const imageSize = new kakao.maps.Size(size, height);
    const imageOption = {
      offset: new kakao.maps.Point(size / 2, height),
    };

    const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    // 마커 생성
    const marker = new kakao.maps.Marker({
      position,
      image: markerImage,
      clickable: true,
      zIndex: isSelected ? MARKER_CONFIG.zIndex.selected : MARKER_CONFIG.zIndex.default,
    });

    marker.setMap(map);
    console.log(`[ShopMarker] 마커 생성 성공: ${shop.name}`);

    // 매장명 라벨 (항상 표시)
    const labelContent = document.createElement('div');
    labelContent.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      color: #333333;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      text-align: center;
      pointer-events: none;
      margin-top: 0;
    `;
    labelContent.textContent = shop.name;

    const labelOverlay = new kakao.maps.CustomOverlay({
      position,
      content: labelContent,
      yAnchor: 0,
      zIndex: isSelected ? MARKER_CONFIG.zIndex.selected - 1 : MARKER_CONFIG.zIndex.default - 1,
    });

    labelOverlay.setMap(map);

    // 클릭 이벤트
    kakao.maps.event.addListener(marker, 'click', () => {
      onClick(shop);
    });

    (marker as any)._labelOverlay = labelOverlay;
    (marker as any)._labelContent = labelContent;
    return marker;
  } catch (error) {
    console.error(`[ShopMarker] 마커 생성 실패: ${shop.name}`, error);
    return null;
  }
}

/**
 * 마커 상태 업데이트
 */
export function updateMarkerState(marker: any, isSelected: boolean): void {
  if (!marker) return;

  const { kakao } = window;
  if (!kakao || !kakao.maps) return;

  const imageSrc = createMarkerImageDataURL(isSelected ? 'selected' : 'default');
  const size = isSelected ? 44 : MARKER_CONFIG.size.width;
  const height = isSelected ? 49 : MARKER_CONFIG.size.height;

  const imageSize = new kakao.maps.Size(size, height);
  const imageOption = {
    offset: new kakao.maps.Point(size / 2, height),
  };

  const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  marker.setImage(markerImage);
  marker.setZIndex(isSelected ? MARKER_CONFIG.zIndex.selected : MARKER_CONFIG.zIndex.default);

  // 라벨 zIndex 업데이트
  if (marker._labelOverlay) {
    marker._labelOverlay.setZIndex(
      isSelected ? MARKER_CONFIG.zIndex.selected - 1 : MARKER_CONFIG.zIndex.default - 1
    );
  }
}

/**
 * 마커 제거
 */
export function removeMarker(marker: any): void {
  if (marker) {
    if (marker._labelOverlay) {
      marker._labelOverlay.setMap(null);
    }
    marker.setMap(null);
  }
}

/**
 * 여러 마커 제거
 */
export function removeMarkers(markers: any[]): void {
  markers.forEach((marker) => removeMarker(marker));
}

/**
 * 클러스터 마커 생성
 */
export function createClusterMarker(
  map: any,
  center: { lat: number; lng: number },
  count: number,
  onClick: () => void
): any {
  const { kakao } = window;

  if (!kakao || !kakao.maps) return null;

  try {
    const position = new kakao.maps.LatLng(center.lat, center.lng);

    // 클러스터 색상
    let bgColor = '#FF6B6B';
    if (count >= 20) bgColor = '#DC143C';
    else if (count >= 10) bgColor = '#FF4500';
    else if (count >= 5) bgColor = '#FF8C00';

    // 클러스터 콘텐츠
    const content = document.createElement('div');
    content.style.cssText = `
      width: 50px;
      height: 50px;
      background: ${bgColor};
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    `;
    content.textContent = count.toString();

    content.addEventListener('mouseenter', () => {
      content.style.transform = 'scale(1.1)';
    });

    content.addEventListener('mouseleave', () => {
      content.style.transform = 'scale(1)';
    });

    content.addEventListener('click', onClick);

    const overlay = new kakao.maps.CustomOverlay({
      position,
      content,
      yAnchor: 0.5,
      zIndex: 100,
    });

    overlay.setMap(map);
    console.log(`[Cluster] 클러스터 마커 생성: ${count}개`);

    (overlay as any)._content = content;
    return overlay;
  } catch (error) {
    console.error('[Cluster] 클러스터 마커 생성 실패', error);
    return null;
  }
}
