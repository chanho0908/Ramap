/**
 * 지도 페이지
 */

'use client';

import { useEffect, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchNearbyShops } from '@ramap/shared';
import type { Shop } from '@ramap/shared';

// 기본 위치: 서울시청
const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 };

export default function MapPage() {
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);

  // 중심 위치: 현재 위치 또는 기본 위치
  const center = location || DEFAULT_LOCATION;

  // 가게 데이터 가져오기
  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        setShopsError(null);
        const data = await fetchNearbyShops(center, 5); // 5km 반경
        setShops(data);
      } catch (err) {
        console.error('[Map Page] Failed to load shops:', err);
        setShopsError(
          err instanceof Error
            ? err.message
            : '가게 정보를 불러올 수 없습니다.'
        );
      } finally {
        setIsLoadingShops(false);
      }
    };

    loadShops();
  }, [center.lat, center.lng]);

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ramap</h1>
          <p className="text-sm text-gray-600">
            {geoLoading ? (
              <span className="flex items-center gap-1">
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-b border-gray-600" />
                위치 확인 중...
              </span>
            ) : (
              `주변 라멘 가게 ${shops.length}곳`
            )}
          </p>
        </div>
        {geoError && (
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            위치 권한 없음 (기본 위치)
          </div>
        )}
      </header>

      {/* 지도 */}
      <main className="flex-1 relative">
        <MapView center={center} shops={shops} zoom={3} />

        {/* 가게 로딩 오버레이 */}
        {isLoadingShops && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-700">가게 검색 중...</span>
          </div>
        )}

        {/* 가게 로드 에러 */}
        {shopsError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg shadow-md px-4 py-3 max-w-md">
            <p className="text-sm text-red-800">{shopsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 가게 없음 메시지 */}
        {!isLoadingShops && !shopsError && shops.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 max-w-sm text-center">
            <div className="text-4xl mb-3">🍜</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              주변에 가게가 없습니다
            </h3>
            <p className="text-sm text-gray-600">
              다른 지역을 검색하거나 지도를 이동해보세요.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
