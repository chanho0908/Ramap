import { useEffect, useMemo, useState } from 'react';
import { fetchShopsBySearch, normalizeShopSearchQuery } from '@ramap/shared';
import type { Shop } from '@ramap/shared';

interface UseShopSearchParams {
  query: string;
  menuCategoryIds?: string[];
  limit?: number;
}

interface UseShopSearchResult {
  shops: Shop[];
  loading: boolean;
  error: string | null;
  isStale: boolean;
}

export function useShopSearch({
  query,
  menuCategoryIds = [],
  limit,
}: UseShopSearchParams): UseShopSearchResult {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedCriteriaKey, setLoadedCriteriaKey] = useState<string | null>(
    null
  );
  const normalizedQuery = normalizeShopSearchQuery(query);
  const menuCategoryKey = useMemo(
    () => [...menuCategoryIds].sort().join(':'),
    [menuCategoryIds]
  );
  const criteriaKey = `${normalizedQuery}:${menuCategoryKey}:${limit ?? ''}`;

  useEffect(() => {
    if (!normalizedQuery) {
      setShops([]);
      setLoading(false);
      setError(null);
      setLoadedCriteriaKey(null);
      return;
    }

    let isCancelled = false;
    const selectedMenuCategoryIds = menuCategoryKey
      ? menuCategoryKey.split(':')
      : [];

    const loadShops = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchShopsBySearch({
          query: normalizedQuery,
          menuCategoryIds: selectedMenuCategoryIds,
          limit,
        });

        if (!isCancelled) {
          setShops(data);
          setLoadedCriteriaKey(criteriaKey);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[useShopSearch] Failed to search shops:', err);
          setError(
            err instanceof Error
              ? err.message
              : '가게 검색 결과를 불러올 수 없습니다.'
          );
          setLoadedCriteriaKey(criteriaKey);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadShops();

    return () => {
      isCancelled = true;
    };
  }, [criteriaKey, limit, menuCategoryKey, normalizedQuery]);

  return {
    shops,
    loading,
    error,
    isStale: normalizedQuery.length > 0 && loadedCriteriaKey !== criteriaKey,
  };
}
