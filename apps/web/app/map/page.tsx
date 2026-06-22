/**
 * 지도 페이지
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapAuthButton } from '@/components/auth/MapAuthButton';
import { MapView } from '@/components/map/MapView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useShopSearch } from '@/hooks/useShopSearch';
import { useShopsByBounds } from '@/hooks/useShopsByBounds';
import { findAdministrativeRegion } from '@/lib/administrative-regions';
import {
  MENU_CATEGORIES,
  normalizeShopSearchQuery,
  searchShops,
} from '@ramap/shared';
import type { Location, MapBounds } from '@ramap/shared';

// 기본 위치: 서울시청
const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 };
const GEOLOCATION_PERMISSION_DENIED = 1;

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
  const {
    location,
    error: geoError,
    loading: geoLoading,
    requestLocation,
  } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenuCategoryIds, setSelectedMenuCategoryIds] = useState<
    string[]
  >([]);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isLocationPermissionDialogOpen, setIsLocationPermissionDialogOpen] =
    useState(false);
  const [hasRequestedCurrentLocation, setHasRequestedCurrentLocation] =
    useState(false);
  const [mapCenter, setMapCenter] = useState<Location>(DEFAULT_LOCATION);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const hasHandledInitialLocationRef = useRef(false);
  const lastAutoCenteredShopKeyRef = useRef<string | null>(null);
  const normalizedSearchQuery = normalizeShopSearchQuery(searchQuery);
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const focusedAdministrativeRegion = useMemo(
    () =>
      hasSearchQuery ? findAdministrativeRegion(normalizedSearchQuery) : null,
    [hasSearchQuery, normalizedSearchQuery]
  );
  const activeShopBounds = focusedAdministrativeRegion?.bounds ?? mapBounds;
  const {
    shops,
    loading: isLoadingShops,
    error: shopsError,
    isStale: areBoundsShopsStale,
  } = useShopsByBounds(activeShopBounds);
  const effectiveSearchQuery = focusedAdministrativeRegion ? '' : searchQuery;
  const administrativeRegionFocusKey = focusedAdministrativeRegion
    ? focusedAdministrativeRegion.canonicalName
    : null;
  const {
    shops: globalSearchShops,
    loading: isLoadingGlobalSearch,
    error: globalSearchError,
    isStale: isGlobalSearchStale,
  } = useShopSearch({
    query: effectiveSearchQuery,
    menuCategoryIds: selectedMenuCategoryIds,
    limit: 50,
  });

  // GPS 위치 변경 시 지도 중심 업데이트 (초기 한 번만)
  useEffect(() => {
    if (!location || hasHandledInitialLocationRef.current) {
      return;
    }

    if (!hasSearchQuery) {
      hasHandledInitialLocationRef.current = true;
      setMapCenter(location);
    }
  }, [hasSearchQuery, location]);

  useEffect(() => {
    if (location && hasRequestedCurrentLocation) {
      setMapCenter(location);
      setIsLocationPermissionDialogOpen(false);
      setHasRequestedCurrentLocation(false);
    }
  }, [hasRequestedCurrentLocation, location]);

  useEffect(() => {
    if (
      hasRequestedCurrentLocation &&
      !geoLoading &&
      geoError?.code === GEOLOCATION_PERMISSION_DENIED
    ) {
      setIsLocationPermissionDialogOpen(true);
      setHasRequestedCurrentLocation(false);
    }
  }, [geoError, geoLoading, hasRequestedCurrentLocation]);

  const searchResults = useMemo(
    () =>
      searchShops(
        focusedAdministrativeRegion
          ? areBoundsShopsStale
            ? []
            : shops
          : hasSearchQuery
            ? globalSearchShops
            : shops,
        {
          query: hasSearchQuery ? effectiveSearchQuery : '',
          menuCategoryIds: selectedMenuCategoryIds,
        }
      ),
    [
      areBoundsShopsStale,
      effectiveSearchQuery,
      focusedAdministrativeRegion,
      globalSearchShops,
      hasSearchQuery,
      selectedMenuCategoryIds,
      shops,
    ]
  );
  const filteredShops = useMemo(
    () => searchResults.map((result) => result.shop),
    [searchResults]
  );
  const searchFocusShopsKey = useMemo(() => {
    if (
      !hasSearchQuery ||
      isLoadingGlobalSearch ||
      isGlobalSearchStale ||
      globalSearchError ||
      focusedAdministrativeRegion ||
      filteredShops.length <= 1
    ) {
      return null;
    }

    const filterKey = [...selectedMenuCategoryIds].sort().join(':');
    const shopKey = filteredShops
      .map((shop) => `${shop.id}:${shop.location.lat}:${shop.location.lng}`)
      .join('|');

    return `${normalizedSearchQuery}:${filterKey}:${shopKey}`;
  }, [
    filteredShops,
    focusedAdministrativeRegion,
    globalSearchError,
    hasSearchQuery,
    isGlobalSearchStale,
    isLoadingGlobalSearch,
    normalizedSearchQuery,
    selectedMenuCategoryIds,
  ]);
  const singleSearchFocusShop = useMemo(() => {
    if (
      !hasSearchQuery ||
      isLoadingGlobalSearch ||
      isGlobalSearchStale ||
      globalSearchError ||
      focusedAdministrativeRegion ||
      filteredShops.length !== 1
    ) {
      return null;
    }

    return filteredShops[0];
  }, [
    filteredShops,
    focusedAdministrativeRegion,
    globalSearchError,
    hasSearchQuery,
    isGlobalSearchStale,
    isLoadingGlobalSearch,
  ]);
  const singleSearchFocusShopKey = useMemo(() => {
    if (!singleSearchFocusShop) {
      return null;
    }

    const filterKey = [...selectedMenuCategoryIds].sort().join(':');

    return [
      normalizedSearchQuery,
      filterKey,
      singleSearchFocusShop.id,
      singleSearchFocusShop.location.lat,
      singleSearchFocusShop.location.lng,
    ].join(':');
  }, [normalizedSearchQuery, selectedMenuCategoryIds, singleSearchFocusShop]);

  const hasSelectedFilters = selectedMenuCategoryIds.length > 0;
  const hasActiveRefinement = hasSearchQuery || hasSelectedFilters;
  const usesGlobalSearchResults =
    hasSearchQuery && !focusedAdministrativeRegion;
  const visibleSourceShopCount = usesGlobalSearchResults
    ? globalSearchShops.length
    : focusedAdministrativeRegion && areBoundsShopsStale
      ? 0
      : shops.length;
  const isLoadingVisibleShops = usesGlobalSearchResults
    ? isLoadingGlobalSearch
    : isLoadingShops || (focusedAdministrativeRegion && areBoundsShopsStale);
  const visibleShopsError = usesGlobalSearchResults
    ? globalSearchError
    : focusedAdministrativeRegion && areBoundsShopsStale
      ? null
      : shopsError;
  const headerSummary = focusedAdministrativeRegion
    ? `${focusedAdministrativeRegion.canonicalName} 라멘 가게 ${
        filteredShops.length
      }곳${
        hasSelectedFilters
          ? ` / 지역 ${visibleSourceShopCount}곳 · 필터 ${selectedMenuCategoryIds.length}개`
          : ''
      }`
    : hasSearchQuery
      ? `전체 검색 결과 ${filteredShops.length}곳${
          hasSelectedFilters
            ? ` · 필터 ${selectedMenuCategoryIds.length}개`
            : ''
        }`
      : hasActiveRefinement
        ? `검색 결과 ${filteredShops.length}곳 / 주변 ${visibleSourceShopCount}곳`
        : `주변 라멘 가게 ${visibleSourceShopCount}곳`;

  useEffect(() => {
    if (!hasSearchQuery) {
      lastAutoCenteredShopKeyRef.current = null;
      return;
    }

    if (focusedAdministrativeRegion) {
      lastAutoCenteredShopKeyRef.current = null;
      return;
    }

    if (isLoadingGlobalSearch || isGlobalSearchStale || globalSearchError) {
      return;
    }

    if (filteredShops.length !== 1) {
      lastAutoCenteredShopKeyRef.current = null;
      return;
    }

    const [shop] = filteredShops;
    const filterKey = [...selectedMenuCategoryIds].sort().join(':');
    const shopKey = [
      normalizedSearchQuery,
      filterKey,
      shop.id,
      shop.location.lat,
      shop.location.lng,
    ].join(':');

    if (lastAutoCenteredShopKeyRef.current === shopKey) {
      return;
    }

    lastAutoCenteredShopKeyRef.current = shopKey;
    setMapCenter(shop.location);
  }, [
    filteredShops,
    focusedAdministrativeRegion,
    globalSearchError,
    hasSearchQuery,
    isGlobalSearchStale,
    isLoadingGlobalSearch,
    normalizedSearchQuery,
    selectedMenuCategoryIds,
  ]);

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

  const handleMoveToCurrentLocation = useCallback(() => {
    if (location) {
      setMapCenter(location);
      setIsLocationPermissionDialogOpen(false);
      return;
    }

    setHasRequestedCurrentLocation(true);
    requestLocation();
  }, [location, requestLocation]);

  const handleRetryLocationPermission = useCallback(() => {
    setIsLocationPermissionDialogOpen(false);
    setHasRequestedCurrentLocation(true);
    requestLocation();
  }, [requestLocation]);

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
            ) : isLoadingVisibleShops ? (
              <span className="flex items-center gap-1">
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-b border-gray-600" />
                가게 검색 중...
              </span>
            ) : (
              headerSummary
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
          focusBounds={focusedAdministrativeRegion?.bounds}
          focusBoundsKey={administrativeRegionFocusKey}
          focusShops={
            !focusedAdministrativeRegion && searchFocusShopsKey
              ? filteredShops
              : undefined
          }
          focusShopsKey={searchFocusShopsKey}
          focusShop={singleSearchFocusShop}
          focusShopKey={singleSearchFocusShopKey}
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
          <div className="absolute bottom-52 left-4 right-4 z-30 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5 sm:left-auto sm:w-96">
            <div className="grid grid-cols-2 gap-2">
              {MENU_CATEGORIES.map((filter) => {
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

        <button
          type="button"
          onClick={handleMoveToCurrentLocation}
          className="absolute bottom-20 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl font-semibold text-gray-800 shadow-xl ring-2 ring-white transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="현재 위치로 이동"
          title="현재 위치로 이동"
          disabled={geoLoading && hasRequestedCurrentLocation}
        >
          {geoLoading && hasRequestedCurrentLocation ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-b-gray-800" />
          ) : (
            '⌖'
          )}
        </button>

        <MapAuthButton />

        {isLocationPermissionDialogOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-permission-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <h2
                id="location-permission-title"
                className="text-lg font-semibold text-gray-900"
              >
                위치 권한이 필요합니다
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                현재 위치로 지도를 이동하려면 브라우저 위치 권한을 허용해주세요.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocationPermissionDialogOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleRetryLocationPermission}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={geoLoading}
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 가게 로딩 오버레이 */}
        {isLoadingVisibleShops && (
          <div className="absolute top-40 left-1/2 z-20 transform -translate-x-1/2 bg-white rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-700">가게 검색 중...</span>
          </div>
        )}

        {/* 가게 로드 에러 */}
        {visibleShopsError && (
          <div className="absolute top-40 left-1/2 z-20 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg shadow-md px-4 py-3 max-w-md">
            <p className="text-sm text-red-800">{visibleShopsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 가게 없음 메시지 */}
        {!isLoadingVisibleShops &&
          !visibleShopsError &&
          filteredShops.length === 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 max-w-sm text-center">
              <div className="text-4xl mb-3">🍜</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasActiveRefinement
                  ? '조건에 맞는 가게가 없습니다'
                  : '주변에 가게가 없습니다'}
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
