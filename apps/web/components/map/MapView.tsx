/**
 * Kakao 지도 컴포넌트
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import type { Shop, Location } from '@ramap/shared';
import { loadKakaoMaps, handleKakaoMapError } from '@/lib/kakao-maps';
import { createShopMarker, removeMarkers } from './ShopMarker';
import type { ShopMarkerInstance } from './ShopMarker';
import { ShopInfoWindow } from './ShopInfoWindow';

interface MapViewProps {
  center: Location;
  shops: Shop[];
  onMarkerClick?: (shop: Shop) => void;
  onMapMove?: (newCenter: Location) => void; // 지도 이동 시 콜백
  zoom?: number; // Kakao Maps level (작을수록 확대, 기본 3)
}

interface KakaoMapInstance {
  setCenter: (center: unknown) => void;
  getCenter: () => {
    getLat: () => number;
    getLng: () => number;
  };
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
  onMarkerClick,
  onMapMove,
  zoom = 3, // 기본값: level 3 (확대된 상태)
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const markersRef = useRef<ShopMarkerInstance[]>([]);
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

        // 지도 드래그 종료 이벤트 리스너 (지도 이동 시 재검색)
        if (onMapMove) {
          kakao.maps.event.addListener(mapInstance, 'dragend', () => {
            const latlng = mapInstance.getCenter();
            const newCenter = {
              lat: latlng.getLat(),
              lng: latlng.getLng(),
            };
            onMapMove(newCenter);
          });
        }

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
  }, [onMapMove]);

  // 중심 위치 변경
  useEffect(() => {
    if (!map || !window.kakao) return;

    const { kakao } = window;
    const newCenter = new kakao.maps.LatLng(center.lat, center.lng);
    map.setCenter(newCenter);
  }, [map, center]);

  // 마커 렌더링
  useEffect(() => {
    if (!map || !window.kakao) return;

    // 기존 마커 제거
    removeMarkers(markersRef.current);

    // 모든 가게를 개별 마커로 표시
    const newMarkers: ShopMarkerInstance[] = [];

    shops.forEach((shop) => {
      const marker = createShopMarker(
        map,
        shop,
        (clickedShop) => {
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

      {/* 가게 수 표시 (우하단) */}
      {shops.length > 0 && !isLoading && !error && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md px-3 py-2 text-sm text-gray-700 z-10">
          <span className="font-semibold">{shops.length}</span>개의 가게
        </div>
      )}
    </div>
  );
}
