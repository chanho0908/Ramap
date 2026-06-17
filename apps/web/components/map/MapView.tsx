/**
 * Kakao 지도 컴포넌트
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import type { Shop, Location } from '@ramap/shared';
import { loadKakaoMaps, handleKakaoMapError } from '@/lib/kakao-maps';
import { createShopMarker, removeMarkers } from './ShopMarker';
import { ShopInfoWindow } from './ShopInfoWindow';

interface MapViewProps {
  center: Location;
  shops: Shop[];
  onMarkerClick?: (shop: Shop) => void;
  zoom?: number;
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
  zoom = 15,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null); // kakao.maps.Map
  const [markers, setMarkers] = useState<any[]>([]); // kakao.maps.Marker[]
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

        // 지도 옵션
        const options = {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: zoom,
        };

        // 지도 생성
        const mapInstance = new kakao.maps.Map(mapRef.current, options);
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
  }, []);

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
    removeMarkers(markers);

    // 새 마커 생성
    const newMarkers = shops.map((shop) =>
      createShopMarker(map, shop, (clickedShop) => {
        setSelectedShop(clickedShop);
        if (onMarkerClick) {
          onMarkerClick(clickedShop);
        }
      })
    );

    setMarkers(newMarkers.filter(Boolean));

    // Cleanup: 컴포넌트 언마운트 시 마커 제거
    return () => {
      removeMarkers(newMarkers);
    };
  }, [map, shops]);

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
