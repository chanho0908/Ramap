'use client';

/**
 * 가게 마커 생성 유틸리티 (개선된 버전)
 */

import type { Shop } from '@ramap/shared';
import { MARKER_CONFIG } from '@ramap/shared';

/**
 * 마커 상태에 따른 이미지 경로 반환
 */
function getMarkerImageSrc(state: 'default' | 'hover' | 'selected'): string {
  switch (state) {
    case 'hover':
      return '/marker-ramen-hover.svg';
    case 'selected':
      return '/marker-ramen-selected.svg';
    default:
      return '/marker-ramen.svg';
  }
}

/**
 * Kakao Maps Marker 생성 (커스텀 이미지 버전)
 *
 * @param map Kakao 지도 인스턴스
 * @param shop 가게 데이터
 * @param onClick 마커 클릭 핸들러
 * @param isSelected 선택 상태 여부
 * @param animationDelay 애니메이션 지연 시간 (ms, 기본 0)
 * @returns Kakao Marker 인스턴스
 */
export function createShopMarker(
  map: any,
  shop: Shop,
  onClick: (shop: Shop) => void,
  isSelected: boolean = false,
  animationDelay: number = 0
): any {
  const { kakao } = window;

  if (!kakao || !kakao.maps) {
    console.error('Kakao Maps SDK가 로드되지 않았습니다.');
    return null;
  }

  // 마커 위치
  const position = new kakao.maps.LatLng(shop.location.lat, shop.location.lng);

  // 애니메이션을 위한 CustomOverlay 사용
  const markerSize = isSelected ? 44 : MARKER_CONFIG.size.width;
  const markerHeight = isSelected ? 49 : MARKER_CONFIG.size.height;
  const imageSrc = getMarkerImageSrc(isSelected ? 'selected' : 'default');

  // 애니메이션 wrapper
  const overlayContent = document.createElement('div');
  overlayContent.style.cssText = `
    position: relative;
    cursor: pointer;
    animation: markerDrop 0.5s ease-out ${animationDelay}ms both;
  `;

  // 마커 이미지
  const markerImg = document.createElement('img');
  markerImg.src = imageSrc;
  markerImg.alt = shop.name;
  markerImg.style.cssText = `
    width: ${markerSize}px;
    height: ${markerHeight}px;
    display: block;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    transition: transform 0.3s ease, filter 0.3s ease;
  `;

  overlayContent.appendChild(markerImg);

  // CSS 애니메이션 추가
  if (!document.getElementById('marker-animation-style')) {
    const style = document.createElement('style');
    style.id = 'marker-animation-style';
    style.textContent = `
      @keyframes markerDrop {
        0% {
          transform: translateY(-100px);
          opacity: 0;
        }
        60% {
          transform: translateY(5px);
          opacity: 1;
        }
        80% {
          transform: translateY(-3px);
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes markerBounce {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // CustomOverlay 생성
  const overlay = new kakao.maps.CustomOverlay({
    position,
    content: overlayContent,
    yAnchor: 1,
    zIndex: isSelected ? MARKER_CONFIG.zIndex.selected : MARKER_CONFIG.zIndex.default,
  });

  overlay.setMap(map);

  // 툴팁 InfoWindow 생성
  const tooltipContent = `
    <div style="
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      border-radius: 8px;
      font-size: 14px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <div style="font-weight: 600; margin-bottom: 2px;">🍜 ${shop.name}</div>
      ${
        shop.kakaoRating
          ? `<div style="font-size: 12px; opacity: 0.9;">⭐ ${shop.kakaoRating.toFixed(1)}</div>`
          : ''
      }
    </div>
  `;

  const infowindow = new kakao.maps.InfoWindow({
    content: tooltipContent,
    removable: false,
  });

  // 마커 DOM 요소 변수
  let currentImageSrc = imageSrc;

  // 호버 이벤트
  overlayContent.addEventListener('mouseenter', () => {
    if (!isSelected) {
      currentImageSrc = getMarkerImageSrc('hover');
      markerImg.src = currentImageSrc;
      markerImg.style.transform = 'scale(1.05)';
      markerImg.style.filter = 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))';
      overlay.setZIndex(MARKER_CONFIG.zIndex.hover);
    }
    // 툴팁 표시
    infowindow.open(map, overlay);
  });

  overlayContent.addEventListener('mouseleave', () => {
    if (!isSelected) {
      currentImageSrc = getMarkerImageSrc('default');
      markerImg.src = currentImageSrc;
      markerImg.style.transform = 'scale(1)';
      markerImg.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
      overlay.setZIndex(MARKER_CONFIG.zIndex.default);
      infowindow.close();
    }
  });

  // 클릭 이벤트
  overlayContent.addEventListener('click', () => {
    // 바운스 애니메이션
    markerImg.style.animation = 'markerBounce 0.5s ease';
    setTimeout(() => {
      markerImg.style.animation = '';
    }, 500);
    onClick(shop);
  });

  // Overlay 객체에 참조 저장 (cleanup 및 업데이트를 위해)
  (overlay as any)._content = overlayContent;
  (overlay as any)._img = markerImg;
  (overlay as any)._infowindow = infowindow;
  (overlay as any)._currentImageSrc = currentImageSrc;

  return overlay;
}

/**
 * 마커 상태 업데이트 (선택 상태)
 */
export function updateMarkerState(overlay: any, isSelected: boolean): void {
  if (!overlay || !overlay._img) return;

  const { kakao } = window;
  if (!kakao || !kakao.maps) return;

  const markerImg = overlay._img;
  const imageSrc = getMarkerImageSrc(isSelected ? 'selected' : 'default');
  const markerSize = isSelected ? 44 : MARKER_CONFIG.size.width;
  const markerHeight = isSelected ? 49 : MARKER_CONFIG.size.height;

  // 이미지 업데이트
  markerImg.src = imageSrc;
  markerImg.style.width = `${markerSize}px`;
  markerImg.style.height = `${markerHeight}px`;

  // z-index 업데이트
  overlay.setZIndex(
    isSelected ? MARKER_CONFIG.zIndex.selected : MARKER_CONFIG.zIndex.default
  );

  // 선택된 경우 툴팁 유지
  if (isSelected && overlay._infowindow) {
    overlay._infowindow.open(overlay.getMap(), overlay);
  } else if (!isSelected && overlay._infowindow) {
    overlay._infowindow.close();
  }
}

/**
 * 마커 제거
 */
export function removeMarker(overlay: any): void {
  if (overlay) {
    // InfoWindow 닫기
    if (overlay._infowindow) {
      overlay._infowindow.close();
    }
    // 이벤트 리스너 제거
    if (overlay._content) {
      overlay._content.remove();
    }
    overlay.setMap(null);
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
 *
 * @param map Kakao 지도 인스턴스
 * @param center 클러스터 중심 위치
 * @param count 클러스터 내 가게 수
 * @param onClick 클릭 핸들러
 * @returns Kakao CustomOverlay 인스턴스
 */
export function createClusterMarker(
  map: any,
  center: { lat: number; lng: number },
  count: number,
  onClick: () => void
): any {
  const { kakao } = window;

  if (!kakao || !kakao.maps) {
    console.error('Kakao Maps SDK가 로드되지 않았습니다.');
    return null;
  }

  const position = new kakao.maps.LatLng(center.lat, center.lng);

  // 클러스터 크기에 따른 색상
  let bgColor = '#FF6B6B';
  if (count >= 20) bgColor = '#DC143C';
  else if (count >= 10) bgColor = '#FF4500';
  else if (count >= 5) bgColor = '#FF8C00';

  // 클러스터 DOM 생성
  const clusterEl = document.createElement('div');
  clusterEl.style.cssText = `
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
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: clusterPop 0.3s ease-out;
  `;
  clusterEl.textContent = count.toString();

  // 호버 효과
  clusterEl.addEventListener('mouseenter', () => {
    clusterEl.style.transform = 'scale(1.1)';
    clusterEl.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  });

  clusterEl.addEventListener('mouseleave', () => {
    clusterEl.style.transform = 'scale(1)';
    clusterEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });

  // 클릭 이벤트
  clusterEl.addEventListener('click', onClick);

  // CSS 애니메이션 추가
  if (!document.getElementById('cluster-animation-style')) {
    const style = document.createElement('style');
    style.id = 'cluster-animation-style';
    style.textContent = `
      @keyframes clusterPop {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        50% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // CustomOverlay 생성
  const overlay = new kakao.maps.CustomOverlay({
    position,
    content: clusterEl,
    yAnchor: 0.5,
    zIndex: 100,
  });

  overlay.setMap(map);

  (overlay as any)._content = clusterEl;
  return overlay;
}
