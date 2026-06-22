/**
 * Kakao 지도 가게 마커 유틸리티
 */

import type { Shop } from '@ramap/shared';
import { MARKER_CONFIG } from '@ramap/shared';

export interface ShopMarkerInstance {
  setMap: (map: unknown | null) => void;
  _labelOverlay?: {
    setMap: (map: unknown | null) => void;
  };
  _labelContent?: HTMLElement;
}

/**
 * Canvas로 마커 이미지 생성 (Data URL 반환)
 */
function createMarkerImageDataURL(state: 'default' | 'hover' | 'selected'): string {
  const canvas = document.createElement('canvas');
  const width = state === 'selected' ? 46 : MARKER_CONFIG.size.width;
  const height = state === 'selected' ? 52 : MARKER_CONFIG.size.height + 1;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const colors = {
    pinTop: state === 'selected' ? '#F15A36' : '#F45B3E',
    pinBottom: state === 'selected' ? '#9B1F23' : '#D9412C',
    cream: '#FFF4DF',
    navy: '#0E2A47',
    navyLight: '#123B5F',
    mint: '#4DBFAE',
    broth: '#FFD98D',
    orange: '#F57C35',
    white: '#FFFFFF',
  };

  const centerX = width / 2;
  const circleY = width / 2 + 1;
  const circleRadius = width / 2 - 3;
  const pinTipY = height - 1;

  // 그림자
  ctx.shadowColor = 'rgba(75, 30, 29, 0.28)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  const pinGradient = ctx.createLinearGradient(centerX, 3, centerX, pinTipY);
  pinGradient.addColorStop(0, colors.pinTop);
  pinGradient.addColorStop(0.62, '#D9412C');
  pinGradient.addColorStop(1, colors.pinBottom);

  // 위치 핀 본체
  ctx.beginPath();
  ctx.arc(centerX, circleY, circleRadius, Math.PI * 0.82, Math.PI * 2.18);
  ctx.quadraticCurveTo(centerX + 8, height - 12, centerX, pinTipY);
  ctx.quadraticCurveTo(centerX - 8, height - 12, centerX - circleRadius * 0.86, circleY + circleRadius * 0.52);
  ctx.closePath();
  ctx.fillStyle = pinGradient;
  ctx.fill();
  ctx.strokeStyle = colors.white;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 내부 배지
  ctx.beginPath();
  ctx.arc(centerX, circleY - 1, circleRadius - 5, 0, Math.PI * 2);
  ctx.fillStyle = colors.cream;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 민트 포인트 아치
  ctx.beginPath();
  ctx.arc(centerX, circleY - 1, circleRadius - 9, Math.PI * 1.08, Math.PI * 1.92);
  ctx.strokeStyle = colors.mint;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  // 라멘 그릇 심볼
  const bowlCenterX = centerX;
  const bowlCenterY = circleY + 3;

  // 김
  ctx.beginPath();
  ctx.roundRect(bowlCenterX + 4, bowlCenterY - 12, 7, 9, 1.5);
  ctx.fillStyle = colors.navy;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(bowlCenterX + 6, bowlCenterY - 10, 3, 5, 1);
  ctx.fillStyle = colors.navyLight;
  ctx.fill();

  // 국물
  ctx.beginPath();
  ctx.ellipse(bowlCenterX, bowlCenterY - 4, 12, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.broth;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bowlCenterX, bowlCenterY - 4, 9, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE8A8';
  ctx.fill();

  // 토핑
  ctx.beginPath();
  ctx.arc(bowlCenterX - 6, bowlCenterY - 6, 3, 0, Math.PI * 2);
  ctx.fillStyle = colors.mint;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bowlCenterX + 2, bowlCenterY - 5, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = colors.pinTop;
  ctx.fill();

  // 면
  ctx.beginPath();
  ctx.moveTo(bowlCenterX - 8, bowlCenterY - 4);
  ctx.quadraticCurveTo(bowlCenterX - 4, bowlCenterY - 1, bowlCenterX, bowlCenterY - 4);
  ctx.quadraticCurveTo(bowlCenterX + 4, bowlCenterY - 7, bowlCenterX + 8, bowlCenterY - 4);
  ctx.moveTo(bowlCenterX - 7, bowlCenterY - 1);
  ctx.quadraticCurveTo(bowlCenterX - 3, bowlCenterY + 2, bowlCenterX + 1, bowlCenterY - 1);
  ctx.quadraticCurveTo(bowlCenterX + 4, bowlCenterY - 3, bowlCenterX + 7, bowlCenterY - 1);
  ctx.strokeStyle = colors.orange;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 그릇
  ctx.beginPath();
  ctx.moveTo(bowlCenterX - 12, bowlCenterY - 1);
  ctx.quadraticCurveTo(bowlCenterX, bowlCenterY + 12, bowlCenterX + 12, bowlCenterY - 1);
  ctx.closePath();
  ctx.fillStyle = colors.navy;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(bowlCenterX, bowlCenterY - 2, 12, 5, 0, 0, Math.PI);
  ctx.strokeStyle = colors.cream;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bowlCenterX - 6, bowlCenterY - 10);
  ctx.quadraticCurveTo(bowlCenterX - 9, bowlCenterY - 15, bowlCenterX - 4, bowlCenterY - 17);
  ctx.moveTo(bowlCenterX + 1, bowlCenterY - 11);
  ctx.quadraticCurveTo(bowlCenterX - 1, bowlCenterY - 16, bowlCenterX + 4, bowlCenterY - 18);
  ctx.strokeStyle = colors.navy;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  if (state === 'selected') {
    ctx.beginPath();
    ctx.arc(centerX, circleY, circleRadius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(14, 42, 71, 0.28)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  return canvas.toDataURL();
}

/**
 * 기본 Kakao Marker로 가게 마커 생성
 */
export function createShopMarker(
  map: unknown,
  shop: Shop,
  onClick: (shop: Shop) => void,
  isSelected: boolean = false
): ShopMarkerInstance | null {
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
    const size = isSelected ? 46 : MARKER_CONFIG.size.width;
    const height = isSelected ? 52 : MARKER_CONFIG.size.height + 1;

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
    }) as ShopMarkerInstance;

    marker.setMap(map);

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
      pointer-events: auto;
      cursor: pointer;
      margin-top: 0;
    `;
    labelContent.textContent = shop.name;
    labelContent.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(shop);
    });

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

    marker._labelOverlay = labelOverlay;
    marker._labelContent = labelContent;
    return marker;
  } catch (error) {
    console.error(`[ShopMarker] 마커 생성 실패: ${shop.name}`, error);
    return null;
  }
}

/**
 * 마커 제거
 */
export function removeMarker(marker: ShopMarkerInstance): void {
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
export function removeMarkers(markers: ShopMarkerInstance[]): void {
  markers.forEach((marker) => removeMarker(marker));
}
