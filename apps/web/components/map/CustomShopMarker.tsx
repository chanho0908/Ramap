'use client';

/**
 * 커스텀 가게 마커 컴포넌트
 * Kakao CustomOverlay를 사용하여 HTML/CSS 기반 마커 렌더링
 */

import { useEffect, useRef, useState } from 'react';
import type { Shop, MarkerState } from '@ramap/shared';
import { MARKER_CONFIG, TOOLTIP_CONFIG } from '@ramap/shared';

interface CustomShopMarkerProps {
  map: any; // kakao.maps.Map
  shop: Shop;
  isSelected?: boolean;
  onClick?: (shop: Shop) => void;
}

/**
 * 커스텀 가게 마커
 *
 * CustomOverlay를 사용하여 라면 마커 아이콘과 평점 배지를 표시합니다.
 * 호버 시 툴팁을 표시하고, 클릭 시 상세 정보창을 엽니다.
 */
export function CustomShopMarker({
  map,
  shop,
  isSelected = false,
  onClick,
}: CustomShopMarkerProps) {
  const overlayRef = useRef<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [markerState, setMarkerState] = useState<MarkerState>('default');
  const [showTooltip, setShowTooltip] = useState(false);

  // 마커 상태에 따른 아이콘 경로
  const getMarkerIcon = (state: MarkerState): string => {
    if (isSelected || state === 'selected') return '/marker-ramen-selected.svg';
    if (state === 'hover') return '/marker-ramen-hover.svg';
    return '/marker-ramen.svg';
  };

  useEffect(() => {
    const { kakao } = window;
    if (!kakao || !kakao.maps || !map) return;

    // CustomOverlay 콘텐츠 생성
    const content = document.createElement('div');
    content.className = 'custom-shop-marker';
    content.style.position = 'relative';
    content.style.cursor = 'pointer';

    // 마커 아이콘
    const markerIcon = document.createElement('img');
    markerIcon.src = getMarkerIcon(markerState);
    markerIcon.alt = shop.name;
    markerIcon.style.width = `${MARKER_CONFIG.size.width}px`;
    markerIcon.style.height = `${MARKER_CONFIG.size.height}px`;
    markerIcon.style.display = 'block';
    markerIcon.style.transition = 'all 0.2s ease';

    // 평점 배지 (평점이 있을 경우만)
    if (shop.kakaoRating && shop.kakaoRating > 0) {
      const badge = document.createElement('div');
      badge.className = 'rating-badge';
      badge.textContent = `⭐${shop.kakaoRating.toFixed(1)}`;
      badge.style.position = 'absolute';
      badge.style.top = '0px';
      badge.style.right = '-8px';
      badge.style.backgroundColor = '#FFFFFF';
      badge.style.border = '1px solid #DDDDDD';
      badge.style.borderRadius = '10px';
      badge.style.padding = '2px 6px';
      badge.style.fontSize = '10px';
      badge.style.fontWeight = 'bold';
      badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
      badge.style.whiteSpace = 'nowrap';
      content.appendChild(badge);
    }

    // 툴팁 (호버 시 표시)
    const tooltip = document.createElement('div');
    tooltip.className = 'marker-tooltip';
    tooltip.style.display = 'none';
    tooltip.style.position = 'absolute';
    tooltip.style.bottom = `${MARKER_CONFIG.size.height + 10}px`;
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.backgroundColor = TOOLTIP_CONFIG.backgroundColor;
    tooltip.style.color = TOOLTIP_CONFIG.color;
    tooltip.style.padding = TOOLTIP_CONFIG.padding;
    tooltip.style.borderRadius = TOOLTIP_CONFIG.borderRadius;
    tooltip.style.fontSize = TOOLTIP_CONFIG.fontSize;
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.zIndex = TOOLTIP_CONFIG.zIndex.toString();
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    tooltip.style.pointerEvents = 'none';

    const tooltipContent = document.createElement('div');
    tooltipContent.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 2px;">🍜 ${shop.name}</div>
      ${
        shop.kakaoRating
          ? `<div style="font-size: 12px; opacity: 0.9;">⭐ ${shop.kakaoRating.toFixed(1)}</div>`
          : ''
      }
    `;
    tooltip.appendChild(tooltipContent);

    content.appendChild(markerIcon);
    content.appendChild(tooltip);
    contentRef.current = content;

    // 마커 위치
    const position = new kakao.maps.LatLng(shop.location.lat, shop.location.lng);

    // CustomOverlay 생성
    const overlay = new kakao.maps.CustomOverlay({
      position,
      content,
      yAnchor: 1, // 하단 중앙을 기준점으로
      zIndex: isSelected ? MARKER_CONFIG.zIndex.selected : MARKER_CONFIG.zIndex.default,
    });

    overlay.setMap(map);
    overlayRef.current = overlay;

    // 이벤트 핸들러
    const handleMouseEnter = () => {
      setMarkerState('hover');
      setShowTooltip(true);
      markerIcon.src = getMarkerIcon('hover');
      tooltip.style.display = 'block';
      overlay.setZIndex(MARKER_CONFIG.zIndex.hover);
    };

    const handleMouseLeave = () => {
      if (!isSelected) {
        setMarkerState('default');
        setShowTooltip(false);
        markerIcon.src = getMarkerIcon('default');
        tooltip.style.display = 'none';
        overlay.setZIndex(MARKER_CONFIG.zIndex.default);
      }
    };

    const handleClick = () => {
      setMarkerState('selected');
      onClick?.(shop);
    };

    // 이벤트 리스너 등록
    content.addEventListener('mouseenter', handleMouseEnter);
    content.addEventListener('mouseleave', handleMouseLeave);
    content.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      content.removeEventListener('mouseenter', handleMouseEnter);
      content.removeEventListener('mouseleave', handleMouseLeave);
      content.removeEventListener('click', handleClick);
      overlay.setMap(null);
    };
  }, [map, shop, isSelected, markerState, onClick]);

  // 선택 상태 변경 시 마커 아이콘 업데이트
  useEffect(() => {
    if (!contentRef.current) return;

    const markerIcon = contentRef.current.querySelector('img');
    if (markerIcon) {
      markerIcon.src = getMarkerIcon(isSelected ? 'selected' : markerState);
    }

    if (overlayRef.current) {
      overlayRef.current.setZIndex(
        isSelected ? MARKER_CONFIG.zIndex.selected : MARKER_CONFIG.zIndex.default
      );
    }

    // 선택된 마커는 툴팁 표시 유지
    if (isSelected) {
      setShowTooltip(true);
      const tooltip = contentRef.current.querySelector('.marker-tooltip') as HTMLElement;
      if (tooltip) {
        tooltip.style.display = 'block';
      }
    }
  }, [isSelected, markerState]);

  // 이 컴포넌트는 DOM을 직접 조작하므로 렌더링할 내용이 없음
  return null;
}

/**
 * 여러 마커를 한번에 렌더링하는 헬퍼 컴포넌트
 */
export function CustomShopMarkers({
  map,
  shops,
  selectedShopId,
  onMarkerClick,
}: {
  map: any;
  shops: Shop[];
  selectedShopId?: string;
  onMarkerClick?: (shop: Shop) => void;
}) {
  return (
    <>
      {shops.map((shop) => (
        <CustomShopMarker
          key={shop.id}
          map={map}
          shop={shop}
          isSelected={shop.id === selectedShopId}
          onClick={onMarkerClick}
        />
      ))}
    </>
  );
}
