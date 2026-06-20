/**
 * Kakao 지도 컴포넌트
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import type { Shop, Location, MapBounds } from '@ramap/shared';
import { loadKakaoMaps, handleKakaoMapError } from '@/lib/kakao-maps';
import { createShopMarker, removeMarkers } from './ShopMarker';
import type { ShopMarkerInstance } from './ShopMarker';
import { ShopInfoWindow } from './ShopInfoWindow';

const SELECTED_SHOP_ZOOM_LEVEL = 4;
const FOCUS_SHOPS_BOUNDS_PADDING = {
  top: 96,
  right: 96,
  bottom: 152,
  left: 32,
};

interface MapViewProps {
  center: Location;
  shops: Shop[];
  focusBounds?: MapBounds | null;
  focusBoundsKey?: string | null;
  focusShops?: Shop[];
  focusShopsKey?: string | null;
  focusShop?: Shop | null;
  focusShopKey?: string | null;
  onMarkerClick?: (shop: Shop) => void;
  onMapMove?: (newCenter: Location) => void; // 지도 이동 시 콜백
  onBoundsChange?: (bounds: MapBounds, center: Location) => void;
  zoom?: number; // Kakao Maps level (작을수록 확대, 기본 3)
}

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoLatLngBounds {
  getSouthWest: () => KakaoLatLng;
  getNorthEast: () => KakaoLatLng;
  extend: (latlng: unknown) => void;
}

interface KakaoMapInstance {
  setCenter: (center: unknown) => void;
  setBounds: (
    bounds: KakaoLatLngBounds,
    paddingTop?: number,
    paddingRight?: number,
    paddingBottom?: number,
    paddingLeft?: number
  ) => void;
  setLevel: (level: number) => void;
  getCenter: () => KakaoLatLng;
  getLevel: () => number;
  getBounds: () => KakaoLatLngBounds;
}

/**
 * Kakao 지도 컴포넌트
 *
 * @example
 * ```tsx
 * <MapView
 *   center={{ lat: 37.5665, lng: 126.9780 }}
 *   shops={shops}
 *   zoom={15}
 * />
 * ```
 */
export function MapView({
  center,
  shops,
  focusBounds,
  focusBoundsKey,
  focusShops,
  focusShopsKey,
  focusShop,
  focusShopKey,
  onMarkerClick,
  onMapMove,
  onBoundsChange,
  zoom = 3, // 기본값: level 3 (확대된 상태)
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const markersRef = useRef<ShopMarkerInstance[]>([]);
  const lastFocusedBoundsKeyRef = useRef<string | null>(null);
  const lastFocusedShopsKeyRef = useRef<string | null>(null);
  const lastFocusedShopKeyRef = useRef<string | null>(null);
  const autoSelectedShopIdRef = useRef<string | null>(null);
  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Kakao Maps SDK 로드
        await loadKakaoMaps();

        const { kakao } = window;
        const initialCenter = initialCenterRef.current;

        // 지도 옵션
        const options = {
          center: new kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
          level: initialZoomRef.current,
        };

        // 지도 생성
        const mapInstance = new kakao.maps.Map(
          mapRef.current,
          options
        ) as KakaoMapInstance;

        const notifyMapPosition = () => {
          const latlng = mapInstance.getCenter();
          const newCenter = {
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          };

          if (onMapMove) {
            onMapMove(newCenter);
          }

          if (onBoundsChange) {
            const mapBounds = mapInstance.getBounds();
            const southWest = mapBounds.getSouthWest();
            const northEast = mapBounds.getNorthEast();

            onBoundsChange(
              {
                minLat: southWest.getLat(),
                maxLat: northEast.getLat(),
                minLng: southWest.getLng(),
                maxLng: northEast.getLng(),
              },
              newCenter
            );
          }
        };

        const closeSelectedShop = () => {
          setSelectedShop(null);
          autoSelectedShopIdRef.current = null;
        };

        notifyMapPosition();
        kakao.maps.event.addListener(mapInstance, 'idle', notifyMapPosition);
        kakao.maps.event.addListener(
          mapInstance,
          'dragstart',
          closeSelectedShop
        );
        kakao.maps.event.addListener(
          mapInstance,
          'zoom_changed',
          closeSelectedShop
        );

        setMap(mapInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('[MapView] 지도 초기화 실패:', err);
        handleKakaoMapError(
          err instanceof Error ? err : new Error('지도 초기화 실패')
        );
        setError('지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        setIsLoading(false);
      }
    };

    initMap();
  }, [onBoundsChange, onMapMove]);

  // 중심 위치 변경
  useEffect(() => {
    if (!map || !window.kakao) return;

    const { kakao } = window;
    const newCenter = new kakao.maps.LatLng(center.lat, center.lng);
    map.setCenter(newCenter);
  }, [map, center]);

  // 행정구역 등 명시된 영역을 한 화면에 표시
  useEffect(() => {
    if (!focusBoundsKey || !focusBounds) {
      lastFocusedBoundsKeyRef.current = null;
      return;
    }

    if (!map || !window.kakao) return;
    if (lastFocusedBoundsKeyRef.current === focusBoundsKey) return;

    const { kakao } = window;
    const bounds = new kakao.maps.LatLngBounds() as KakaoLatLngBounds;

    bounds.extend(
      new kakao.maps.LatLng(focusBounds.minLat, focusBounds.minLng)
    );
    bounds.extend(
      new kakao.maps.LatLng(focusBounds.maxLat, focusBounds.maxLng)
    );

    lastFocusedBoundsKeyRef.current = focusBoundsKey;
    map.setBounds(
      bounds,
      FOCUS_SHOPS_BOUNDS_PADDING.top,
      FOCUS_SHOPS_BOUNDS_PADDING.right,
      FOCUS_SHOPS_BOUNDS_PADDING.bottom,
      FOCUS_SHOPS_BOUNDS_PADDING.left
    );
  }, [focusBounds, focusBoundsKey, map]);

  // 검색 결과 여러 개를 한 화면에 표시
  useEffect(() => {
    if (focusBoundsKey) {
      lastFocusedShopsKeyRef.current = null;
      return;
    }

    if (!focusShopsKey || !focusShops || focusShops.length < 2) {
      lastFocusedShopsKeyRef.current = null;
      return;
    }

    if (!map || !window.kakao) return;
    if (lastFocusedShopsKeyRef.current === focusShopsKey) return;

    const { kakao } = window;
    const bounds = new kakao.maps.LatLngBounds() as KakaoLatLngBounds;

    focusShops.forEach((shop) => {
      bounds.extend(
        new kakao.maps.LatLng(shop.location.lat, shop.location.lng)
      );
    });

    lastFocusedShopsKeyRef.current = focusShopsKey;
    map.setBounds(
      bounds,
      FOCUS_SHOPS_BOUNDS_PADDING.top,
      FOCUS_SHOPS_BOUNDS_PADDING.right,
      FOCUS_SHOPS_BOUNDS_PADDING.bottom,
      FOCUS_SHOPS_BOUNDS_PADDING.left
    );
  }, [focusBoundsKey, focusShops, focusShopsKey, map]);

  // 검색 결과가 하나일 때 해당 가게 상세보기를 표시
  useEffect(() => {
    if (focusBoundsKey) {
      lastFocusedShopKeyRef.current = null;
      const autoSelectedShopId = autoSelectedShopIdRef.current;
      autoSelectedShopIdRef.current = null;
      setSelectedShop((currentSelectedShop) =>
        currentSelectedShop?.id === autoSelectedShopId
          ? null
          : currentSelectedShop
      );
      return;
    }

    if (!focusShopKey || !focusShop) {
      lastFocusedShopKeyRef.current = null;
      const autoSelectedShopId = autoSelectedShopIdRef.current;
      autoSelectedShopIdRef.current = null;
      setSelectedShop((currentSelectedShop) =>
        currentSelectedShop?.id === autoSelectedShopId
          ? null
          : currentSelectedShop
      );
      return;
    }

    if (lastFocusedShopKeyRef.current === focusShopKey) {
      return;
    }

    lastFocusedShopKeyRef.current = focusShopKey;
    autoSelectedShopIdRef.current = focusShop.id;
    setSelectedShop(focusShop);
  }, [focusBoundsKey, focusShop, focusShopKey]);

  // 마커 렌더링
  useEffect(() => {
    if (!map || !window.kakao) return;

    const { kakao } = window;

    // 기존 마커 제거
    removeMarkers(markersRef.current);

    // 모든 가게를 개별 마커로 표시
    const newMarkers: ShopMarkerInstance[] = [];

    shops.forEach((shop) => {
      const marker = createShopMarker(
        map,
        shop,
        (clickedShop) => {
          const markerPosition = new kakao.maps.LatLng(
            clickedShop.location.lat,
            clickedShop.location.lng
          );

          if (map.getLevel() > SELECTED_SHOP_ZOOM_LEVEL) {
            map.setLevel(SELECTED_SHOP_ZOOM_LEVEL);
          }

          map.setCenter(markerPosition);
          autoSelectedShopIdRef.current = null;
          setSelectedShop(clickedShop);
          if (onMarkerClick) {
            onMarkerClick(clickedShop);
          }
        },
        selectedShop?.id === shop.id
      );
      if (marker) newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    // Cleanup
    return () => {
      removeMarkers(newMarkers);
      if (markersRef.current === newMarkers) {
        markersRef.current = [];
      }
    };
  }, [map, shops, selectedShop?.id, onMarkerClick]);

  return (
    <div className="relative w-full h-full">
      {/* 지도 컨테이너 - 항상 렌더링 */}
      <div ref={mapRef} className="w-full h-full" />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">지도를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 오버레이 */}
      {error && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 z-20">
          <div className="text-center max-w-md p-6">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              지도 로드 실패
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )}

      {/* 정보창 */}
      {selectedShop && !isLoading && !error && (
        <ShopInfoWindow
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
        />
      )}
    </div>
  );
}
