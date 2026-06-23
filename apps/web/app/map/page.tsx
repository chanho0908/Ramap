/**
 * 지도 페이지
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  MapAuthButton,
  type PersonalizationView,
} from '@/components/auth/MapAuthButton';
import { MapView } from '@/components/map/MapView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useShopSearch } from '@/hooks/useShopSearch';
import { useShopsByBounds } from '@/hooks/useShopsByBounds';
import { findAdministrativeRegion } from '@/lib/administrative-regions';
import {
  MENU_CATEGORIES,
  addShopBookmark,
  fetchShopsByIds,
  fetchUserShopPersonalization,
  getCurrentSession,
  getCurrentUser,
  hideShop,
  normalizeShopSearchQuery,
  onAuthStateChange,
  removeShopBookmark,
  searchShops,
  signInWithKakao,
  signOut,
  unhideShop,
} from '@ramap/shared';
import type { Location, MapBounds, Shop } from '@ramap/shared';

// 기본 위치: 서울시청
const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 };
const GEOLOCATION_PERMISSION_DENIED = 1;
const LOGIN_GUIDE_MESSAGE =
  '로그인하면 Shop 북마크와 숨김 기능을 사용할 수 있습니다.';

function FilterIcon({ isActive }: { isActive: boolean }) {
  return (
    <img
      aria-hidden="true"
      src="/filter-icon.png"
      alt=""
      className={`h-6 w-6 ${isActive ? 'invert' : ''}`}
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [bookmarkedShopIds, setBookmarkedShopIds] = useState<string[]>([]);
  const [hiddenShopIds, setHiddenShopIds] = useState<string[]>([]);
  const [personalizationError, setPersonalizationError] = useState<
    string | null
  >(null);
  const [isPersonalizationLoading, setIsPersonalizationLoading] =
    useState(false);
  const [isPersonalizationSubmitting, setIsPersonalizationSubmitting] =
    useState(false);
  const [personalizationView, setPersonalizationView] =
    useState<PersonalizationView>('all');
  const [personalizedShops, setPersonalizedShops] = useState<Shop[]>([]);
  const [isLoadingPersonalizedShops, setIsLoadingPersonalizedShops] =
    useState(false);
  const [personalizedShopsError, setPersonalizedShopsError] = useState<
    string | null
  >(null);
  const [loginGuideMessage, setLoginGuideMessage] = useState<string | null>(
    null
  );
  const [isAccountDeletionDialogOpen, setIsAccountDeletionDialogOpen] =
    useState(false);
  const [shopPendingHide, setShopPendingHide] = useState<Shop | null>(null);
  const [accountDeletionError, setAccountDeletionError] = useState<
    string | null
  >(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const hasHandledInitialLocationRef = useRef(false);
  const lastAutoCenteredShopKeyRef = useRef<string | null>(null);
  const normalizedSearchQuery = normalizeShopSearchQuery(searchQuery);
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const focusedAdministrativeRegion = useMemo(
    () =>
      hasSearchQuery && personalizationView === 'all'
        ? findAdministrativeRegion(normalizedSearchQuery)
        : null,
    [hasSearchQuery, normalizedSearchQuery, personalizationView]
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
  const authRedirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', '/map');

    return callbackUrl.toString();
  }, []);

  const bookmarkedShopIdSet = useMemo(
    () => new Set(bookmarkedShopIds),
    [bookmarkedShopIds]
  );
  const hiddenShopIdSet = useMemo(
    () => new Set(hiddenShopIds),
    [hiddenShopIds]
  );
  const isWaitingForAllViewPersonalization =
    personalizationView === 'all' && Boolean(user) && isPersonalizationLoading;

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });

    const unsubscribe = onAuthStateChange(({ session }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setBookmarkedShopIds([]);
      setHiddenShopIds([]);
      setPersonalizationView('all');
      setPersonalizedShops([]);
      setPersonalizationError(null);
      setIsPersonalizationLoading(false);
      setShopPendingHide(null);
      return;
    }

    setIsPersonalizationLoading(true);
    setPersonalizationError(null);

    fetchUserShopPersonalization(user.id)
      .then((personalization) => {
        if (!isMounted) {
          return;
        }

        setBookmarkedShopIds(personalization.bookmarkedShopIds);
        setHiddenShopIds(personalization.hiddenShopIds);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setPersonalizationError(
          error instanceof Error
            ? error.message
            : 'Shop 개인화 정보를 가져올 수 없습니다.'
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsPersonalizationLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const targetShopIds =
      personalizationView === 'bookmarked'
        ? bookmarkedShopIds
        : personalizationView === 'hidden'
          ? hiddenShopIds
          : [];

    if (personalizationView === 'all' || targetShopIds.length === 0) {
      setPersonalizedShops([]);
      setPersonalizedShopsError(null);
      setIsLoadingPersonalizedShops(false);
      return;
    }

    setPersonalizedShops([]);
    setIsLoadingPersonalizedShops(true);
    setPersonalizedShopsError(null);

    fetchShopsByIds(targetShopIds)
      .then((shopsByIds) => {
        if (isMounted) {
          setPersonalizedShops(shopsByIds);
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setPersonalizedShops([]);
        setPersonalizedShopsError(
          error instanceof Error
            ? error.message
            : 'Shop 목록을 가져올 수 없습니다.'
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPersonalizedShops(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [bookmarkedShopIds, hiddenShopIds, personalizationView]);

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
  const visibleSearchResults = useMemo(
    () =>
      personalizationView === 'all' && !isWaitingForAllViewPersonalization
        ? searchResults.filter((result) => !hiddenShopIdSet.has(result.shop.id))
        : searchResults,
    [
      hiddenShopIdSet,
      isWaitingForAllViewPersonalization,
      personalizationView,
      searchResults,
    ]
  );
  const personalizedSearchResults = useMemo(
    () =>
      searchShops(personalizedShops, {
        query: hasSearchQuery ? effectiveSearchQuery : '',
        menuCategoryIds: selectedMenuCategoryIds,
      }),
    [
      effectiveSearchQuery,
      hasSearchQuery,
      personalizedShops,
      selectedMenuCategoryIds,
    ]
  );
  const filteredShops = useMemo(
    () =>
      (isWaitingForAllViewPersonalization
        ? []
        : personalizationView === 'all'
          ? visibleSearchResults
          : personalizedSearchResults
      ).map((result) => result.shop),
    [
      isWaitingForAllViewPersonalization,
      personalizationView,
      personalizedSearchResults,
      visibleSearchResults,
    ]
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
  const hasActivePersonalizationView = personalizationView !== 'all';
  const usesGlobalSearchResults =
    personalizationView === 'all' &&
    hasSearchQuery &&
    !focusedAdministrativeRegion;
  const isLoadingVisibleShops = isWaitingForAllViewPersonalization
    ? true
    : usesGlobalSearchResults
      ? isLoadingGlobalSearch
      : hasActivePersonalizationView
        ? isPersonalizationLoading || isLoadingPersonalizedShops
        : isLoadingShops ||
          (focusedAdministrativeRegion && areBoundsShopsStale);
  const visibleShopsError = usesGlobalSearchResults
    ? globalSearchError
    : hasActivePersonalizationView
      ? (personalizationError ?? personalizedShopsError)
      : focusedAdministrativeRegion && areBoundsShopsStale
        ? null
        : shopsError;

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

  const showLoginGuide = useCallback(() => {
    setLoginGuideMessage(LOGIN_GUIDE_MESSAGE);
  }, []);

  const handleLogin = useCallback(async () => {
    setIsAuthSubmitting(true);

    try {
      await signInWithKakao({ redirectTo: authRedirectTo });
    } finally {
      setIsAuthSubmitting(false);
    }
  }, [authRedirectTo]);

  const handleLogout = useCallback(async () => {
    setIsAuthSubmitting(true);

    try {
      await signOut();
      setUser(null);
      setPersonalizationView('all');
      setShopPendingHide(null);
    } finally {
      setIsAuthSubmitting(false);
    }
  }, []);

  const handleToggleBookmark = useCallback(
    async (shop: Shop) => {
      if (!user) {
        showLoginGuide();
        return;
      }

      const isBookmarked = bookmarkedShopIdSet.has(shop.id);
      setIsPersonalizationSubmitting(true);
      setPersonalizationError(null);

      try {
        if (isBookmarked) {
          await removeShopBookmark(shop.id);
          setBookmarkedShopIds((current) =>
            current.filter((shopId) => shopId !== shop.id)
          );
        } else {
          await addShopBookmark(shop.id);
          setBookmarkedShopIds((current) =>
            current.includes(shop.id) ? current : [...current, shop.id]
          );
        }
      } catch (error) {
        setPersonalizationError(
          error instanceof Error
            ? error.message
            : 'Shop 북마크 상태를 변경할 수 없습니다.'
        );
      } finally {
        setIsPersonalizationSubmitting(false);
      }
    },
    [bookmarkedShopIdSet, showLoginGuide, user]
  );

  const handleToggleHidden = useCallback(
    async (shop: Shop) => {
      if (!user) {
        showLoginGuide();
        return;
      }

      const isHidden = hiddenShopIdSet.has(shop.id);

      if (!isHidden) {
        setShopPendingHide(shop);
        return;
      }

      setIsPersonalizationSubmitting(true);
      setPersonalizationError(null);

      try {
        await unhideShop(shop.id);
        setHiddenShopIds((current) =>
          current.filter((shopId) => shopId !== shop.id)
        );
      } catch (error) {
        setPersonalizationError(
          error instanceof Error
            ? error.message
            : 'Shop 숨김 상태를 변경할 수 없습니다.'
        );
      } finally {
        setIsPersonalizationSubmitting(false);
      }
    },
    [hiddenShopIdSet, showLoginGuide, user]
  );

  const handleConfirmHideShop = useCallback(async () => {
    if (!shopPendingHide) {
      return;
    }

    const shop = shopPendingHide;
    setIsPersonalizationSubmitting(true);
    setPersonalizationError(null);

    try {
      await hideShop(shop.id);
      setHiddenShopIds((current) =>
        current.includes(shop.id) ? current : [...current, shop.id]
      );
      setShopPendingHide(null);
    } catch (error) {
      setPersonalizationError(
        error instanceof Error
          ? error.message
          : 'Shop 숨김 상태를 변경할 수 없습니다.'
      );
    } finally {
      setIsPersonalizationSubmitting(false);
    }
  }, [shopPendingHide]);

  const handleShowBookmarkedShops = useCallback(() => {
    if (!user) {
      showLoginGuide();
      return;
    }

    setPersonalizationView((current) =>
      current === 'bookmarked' ? 'all' : 'bookmarked'
    );
  }, [showLoginGuide, user]);

  const handleShowHiddenShops = useCallback(() => {
    if (!user) {
      showLoginGuide();
      return;
    }

    setPersonalizationView((current) =>
      current === 'hidden' ? 'all' : 'hidden'
    );
  }, [showLoginGuide, user]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);
    setAccountDeletionError(null);

    try {
      const session = await getCurrentSession();

      if (!session?.access_token) {
        throw new Error('다시 로그인한 뒤 계정 삭제를 시도해주세요.');
      }

      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          body?.error ?? '계정 삭제 서버 설정을 확인해야 합니다.'
        );
      }

      try {
        await signOut();
      } catch {
        // The Auth user may already be deleted, so local state cleanup must win.
      } finally {
        setUser(null);
        setBookmarkedShopIds([]);
        setHiddenShopIds([]);
        setPersonalizedShops([]);
        setPersonalizationView('all');
        setPersonalizationError(null);
        setPersonalizedShopsError(null);
        setLoginGuideMessage(null);
        setIsAccountDeletionDialogOpen(false);
        setShopPendingHide(null);
      }
    } catch (error) {
      setAccountDeletionError(
        error instanceof Error ? error.message : '계정을 삭제할 수 없습니다.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* 지도 */}
      <main className="flex-1 relative">
        <MapView
          center={mapCenter}
          shops={filteredShops}
          bookmarkedShopIds={bookmarkedShopIdSet}
          hiddenShopIds={hiddenShopIdSet}
          isPersonalizationSubmitting={isPersonalizationSubmitting}
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
          onToggleBookmark={handleToggleBookmark}
          onToggleHidden={handleToggleHidden}
        />

        <section className="absolute left-0 right-0 top-0 z-20 px-4 pt-4 pointer-events-none">
          <label htmlFor="shop-search" className="sr-only">
            라멘 가게 검색
          </label>
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <div className="ds-panel relative rounded-[24px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl leading-none text-gray-800">
                ⌕
              </span>
              <input
                id="shop-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
                placeholder="가게명, 주소, 전화번호"
                className="h-14 w-full rounded-[24px] border-0 bg-white pl-12 pr-16 text-base font-[480] text-black outline-none placeholder:font-[330] placeholder:text-gray-500 focus:ring-2 focus:ring-black/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-medium text-black hover:bg-[var(--ds-surface-soft)]"
                  aria-label="검색어 지우기"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
        </section>

        {isMoreFiltersOpen && (
          <div className="ds-panel absolute bottom-52 left-4 right-4 z-30 p-3 sm:left-auto sm:w-96">
            <div className="grid grid-cols-2 gap-2">
              {MENU_CATEGORIES.map((filter) => {
                const isSelected = selectedMenuCategoryIds.includes(filter.id);

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => toggleMenuCategory(filter.id)}
                    className={`min-h-10 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-black text-white'
                        : 'bg-[var(--ds-surface-soft)] text-black hover:bg-[var(--ds-surface-soft)]'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMoreFiltersOpen((current) => !current)}
          className={`ds-icon-button absolute bottom-20 right-4 z-30 h-14 w-14 shadow-[var(--ds-shadow-soft)] ring-2 ring-white ${
            isMoreFiltersOpen ? 'ds-icon-button-active' : ''
          }`}
          aria-label="메뉴 필터"
          aria-expanded={isMoreFiltersOpen}
          title="메뉴 필터"
        >
          <FilterIcon isActive={isMoreFiltersOpen} />
          {hasSelectedFilters && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-950 px-1.5 text-xs font-bold text-white ring-2 ring-white">
              {selectedMenuCategoryIds.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleShowBookmarkedShops}
          className={`ds-icon-button absolute bottom-4 right-4 z-30 h-14 w-14 text-2xl font-semibold shadow-[var(--ds-shadow-soft)] ring-2 ring-white ${
            personalizationView === 'bookmarked'
              ? 'ds-icon-button-active'
              : ''
          }`}
          aria-label="북마크한 Shop만 보기"
          aria-pressed={personalizationView === 'bookmarked'}
          title="북마크한 Shop만 보기"
        >
          {personalizationView === 'bookmarked' ? '★' : '☆'}
        </button>

        <button
          type="button"
          onClick={handleMoveToCurrentLocation}
          className="ds-icon-button absolute bottom-20 left-4 z-30 h-14 w-14 text-2xl font-semibold shadow-[var(--ds-shadow-soft)] ring-2 ring-white disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="현재 위치로 이동"
          title="현재 위치로 이동"
          disabled={geoLoading && hasRequestedCurrentLocation}
        >
          {geoLoading && hasRequestedCurrentLocation ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-b-gray-800" />
          ) : (
            <svg
              aria-hidden="true"
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
            </svg>
          )}
        </button>

        <MapAuthButton
          user={user}
          isLoading={isAuthLoading}
          isSubmitting={isAuthSubmitting}
          activeView={personalizationView}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onShowHiddenShops={handleShowHiddenShops}
          onRequestAccountDeletion={() => setIsAccountDeletionDialogOpen(true)}
        />

        {loginGuideMessage && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--ds-overlay-scrim)] px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-guide-title"
          >
            <div className="ds-modal-panel w-full max-w-sm p-5">
              <h2
                id="login-guide-title"
                className="text-lg font-semibold text-gray-900"
              >
                로그인이 필요합니다
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {loginGuideMessage}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLoginGuideMessage(null)}
                  className="ds-pill-button ds-pill-secondary"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="ds-pill-button bg-[#FEE500] text-[#191919] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isAuthSubmitting}
                >
                  카카오 로그인
                </button>
              </div>
            </div>
          </div>
        )}

        {shopPendingHide && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--ds-overlay-scrim)] px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hide-shop-title"
          >
            <div className="ds-modal-panel w-full max-w-sm p-5">
              <h2
                id="hide-shop-title"
                className="text-lg font-semibold text-gray-900"
              >
                이 매장을 숨기시겠습니까?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                숨긴 매장은 지도에서 제외되며, 설정의 숨긴 매장 보기에서
                다시 확인할 수 있습니다.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShopPendingHide(null)}
                  className="ds-pill-button ds-pill-secondary"
                  disabled={isPersonalizationSubmitting}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHideShop}
                  className="ds-pill-button ds-pill-primary disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isPersonalizationSubmitting}
                >
                  {isPersonalizationSubmitting ? '숨기는 중...' : '숨기기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isAccountDeletionDialogOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--ds-overlay-scrim)] px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-deletion-title"
          >
            <div className="ds-modal-panel w-full max-w-sm p-5">
              <h2
                id="account-deletion-title"
                className="text-lg font-semibold text-gray-900"
              >
                계정을 삭제할까요?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                계정과 Supabase Auth 사용자가 삭제됩니다. 서버에
                SUPABASE_SERVICE_ROLE_KEY가 설정되어 있어야 실행됩니다.
              </p>
              {accountDeletionError && (
                <p className="mt-3 rounded-lg border border-[var(--ds-hairline)] bg-[var(--ds-surface-soft)] px-3 py-2 text-sm text-black">
                  {accountDeletionError}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountDeletionDialogOpen(false);
                    setAccountDeletionError(null);
                  }}
                  className="ds-pill-button ds-pill-secondary"
                  disabled={isDeletingAccount}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="ds-pill-button ds-pill-primary disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? '삭제 중...' : '계정 삭제'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLocationPermissionDialogOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--ds-overlay-scrim)] px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-permission-title"
          >
            <div className="ds-modal-panel w-full max-w-sm p-5">
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
                  className="ds-pill-button ds-pill-secondary"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleRetryLocationPermission}
                  className="ds-pill-button ds-pill-primary disabled:cursor-not-allowed disabled:opacity-70"
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
          <div className="ds-panel absolute left-1/2 top-40 z-20 flex -translate-x-1/2 items-center gap-2 px-4 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-b-black" />
            <span className="text-sm font-medium text-black">
              가게 검색 중...
            </span>
          </div>
        )}

        {/* 가게 로드 에러 */}
        {visibleShopsError && (
          <div className="ds-panel absolute left-1/2 top-40 z-20 max-w-md -translate-x-1/2 px-4 py-3">
            <p className="text-sm text-black">{visibleShopsError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs font-medium uppercase tracking-[0.05em] text-black"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 가게 없음 메시지 */}
        {!isLoadingVisibleShops &&
          !visibleShopsError &&
          filteredShops.length === 0 && (
            <div className="ds-panel absolute left-1/2 top-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 p-6 text-center">
              <div className="text-4xl mb-3">🍜</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasActivePersonalizationView
                  ? `${personalizationView === 'bookmarked' ? '북마크한' : '숨긴'} Shop이 없습니다`
                  : hasActiveRefinement
                    ? '조건에 맞는 가게가 없습니다'
                    : '주변에 가게가 없습니다'}
              </h3>
              <p className="text-sm text-gray-600">
                {hasActivePersonalizationView
                  ? '현재 보기 버튼을 다시 누르면 전체 매장으로 돌아갑니다.'
                  : hasActiveRefinement
                    ? '검색어나 필터를 바꾸면 주변 가게를 다시 볼 수 있습니다.'
                    : '다른 지역을 검색하거나 지도를 이동해보세요.'}
              </p>
            </div>
          )}
      </main>
    </div>
  );
}
