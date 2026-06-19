/**
 * 지도 페이지
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useShopsByBounds } from '@/hooks/useShopsByBounds';
import { filterShopsByQuery, normalizeShopSearchQuery } from '@ramap/shared';
import type { Location, MapBounds } from '@ramap/shared';

// 기본 위치: 서울시청
const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 };

const MENU_FILTERS = [
  { id: 'tonkotsu', label: '돈코츠' },
  { id: 'shoyu', label: '쇼유' },
  { id: 'shio', label: '시오' },
  { id: 'miso', label: '미소' },
  { id: 'tori', label: '토리' },
  { id: 'tsukemen', label: '츠케멘' },
  { id: 'mazesoba', label: '마제소바' },
  { id: 'aburasoba', label: '아부라소바' },
  { id: 'jiro', label: '지로계' },
  { id: 'niboshi_gyokai', label: '니보시/어패류' },
  { id: 'iekei', label: '이에케' },
  { id: 'hiyashi', label: '히야시' },
  { id: 'chukasoba', label: '츄카소바' },
  { id: 'tomato', label: '토마토라멘' },
] as const;

function FilterIcon() {
  return (
    <img
      aria-hidden="true"
      src="/filter-icon.png"
      alt=""
      className="h-6 w-6 invert"
    />
  );
}

export default function MapPage() {
  const { location, error: geoError, loading: geoLoading } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenuCategoryIds, setSelectedMenuCategoryIds] = useState<string[]>([]);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<Location>(DEFAULT_LOCATION);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const {
    shops,
    loading: isLoadingShops,
    error: shopsError,
  } = useShopsByBounds(mapBounds);

  // GPS 위치 변경 시 지도 중심 업데이트 (초기 한 번만)
  useEffect(() => {
    if (location) {
      setMapCenter(location);
    }
  }, [location]);

  const normalizedSearchQuery = normalizeShopSearchQuery(searchQuery);
  const searchFilteredShops = useMemo(
    () => filterShopsByQuery(shops, searchQuery),
    [shops, searchQuery]
  );
  const filteredShops = useMemo(() => {
    if (selectedMenuCategoryIds.length === 0) {
      return searchFilteredShops;
    }

    return searchFilteredShops.filter((shop) =>
      selectedMenuCategoryIds.some((categoryId) =>
        shop.menuCategoryIds.includes(categoryId)
      )
    );
  }, [searchFilteredShops, selectedMenuCategoryIds]);

  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasSelectedFilters = selectedMenuCategoryIds.length > 0;
  const hasActiveRefinement = hasSearchQuery || hasSelectedFilters;

  const handleBoundsChange = useCallback(
    (bounds: MapBounds, center: Location) => {
      setMapBounds(bounds);
      setMapCenter((currentCenter) => {
        if (
          currentCenter.lat === center.lat &&
          currentCenter.lng === center.lng
        ) {
          return currentCenter;
        }

        return center;
      });
    },
    []
  );

  const toggleMenuCategory = useCallback((categoryId: string) => {
    setSelectedMenuCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }, []);

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
            ) : hasActiveRefinement ? (
              `검색 결과 ${filteredShops.length}곳 / 주변 ${shops.length}곳`
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
        <MapView
          center={mapCenter}
          shops={filteredShops}
          zoom={3}
          onBoundsChange={handleBoundsChange}
        />

        <section className="absolute left-0 right-0 top-0 z-20 px-4 pt-4 pointer-events-none">
          <label htmlFor="shop-search" className="sr-only">
            라멘 가게 검색
          </label>
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <div className="relative rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl leading-none text-gray-800">
                ⌕
              </span>
              <input
                id="shop-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
                placeholder="가게명, 주소, 전화번호"
                className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-16 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-red-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="검색어 지우기"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
        </section>

        {isMoreFiltersOpen && (
          <div className="absolute bottom-36 left-4 right-4 z-30 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5 sm:left-auto sm:w-96">
            <div className="grid grid-cols-2 gap-2">
              {MENU_FILTERS.map((filter) => {
                const isSelected = selectedMenuCategoryIds.includes(filter.id);

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => toggleMenuCategory(filter.id)}
                    className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            {hasSelectedFilters && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedMenuCategoryIds([])}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                  aria-label="선택한 필터 초기화"
                  title="선택한 필터 초기화"
                >
                  ↺
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMoreFiltersOpen((current) => !current)}
          className="absolute bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl ring-2 ring-white transition-colors hover:bg-blue-700"
          aria-label="메뉴 필터"
          aria-expanded={isMoreFiltersOpen}
          title="메뉴 필터"
        >
          <FilterIcon />
          {hasSelectedFilters && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-950 px-1.5 text-xs font-bold text-white ring-2 ring-white">
              {selectedMenuCategoryIds.length}
            </span>
          )}
        </button>

        {/* 가게 로딩 오버레이 */}
        {isLoadingShops && (
          <div className="absolute top-40 left-1/2 z-20 transform -translate-x-1/2 bg-white rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-700">가게 검색 중...</span>
          </div>
        )}

        {/* 가게 로드 에러 */}
        {shopsError && (
          <div className="absolute top-40 left-1/2 z-20 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg shadow-md px-4 py-3 max-w-md">
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
        {!isLoadingShops && !shopsError && filteredShops.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 max-w-sm text-center">
            <div className="text-4xl mb-3">🍜</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveRefinement ? '조건에 맞는 가게가 없습니다' : '주변에 가게가 없습니다'}
            </h3>
            <p className="text-sm text-gray-600">
              {hasActiveRefinement
                ? '검색어나 필터를 바꾸면 주변 가게를 다시 볼 수 있습니다.'
                : '다른 지역을 검색하거나 지도를 이동해보세요.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
