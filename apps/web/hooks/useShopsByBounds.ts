import { useEffect, useMemo, useState } from 'react';
import { fetchShopsByBounds } from '@ramap/shared';
import type { MapBounds, Shop } from '@ramap/shared';

interface UseShopsByBoundsResult {
  shops: Shop[];
  loading: boolean;
  error: string | null;
}

function floorCoordinate(value: number): number {
  return Math.floor(value * 10000) / 10000;
}

function ceilCoordinate(value: number): number {
  return Math.ceil(value * 10000) / 10000;
}

function getBoundsKey(bounds: MapBounds | null): string | null {
  if (!bounds) return null;

  const fetchBounds = getFetchBounds(bounds);

  return [
    fetchBounds.minLat,
    fetchBounds.maxLat,
    fetchBounds.minLng,
    fetchBounds.maxLng,
  ].join(':');
}

function getFetchBounds(bounds: MapBounds): MapBounds {
  return {
    minLat: floorCoordinate(bounds.minLat),
    maxLat: ceilCoordinate(bounds.maxLat),
    minLng: floorCoordinate(bounds.minLng),
    maxLng: ceilCoordinate(bounds.maxLng),
  };
}

export function useShopsByBounds(
  bounds: MapBounds | null
): UseShopsByBoundsResult {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boundsKey = useMemo(() => getBoundsKey(bounds), [bounds]);

  useEffect(() => {
    if (!boundsKey) {
      setShops([]);
      setLoading(false);
      setError(null);
      return;
    }

    const [minLat, maxLat, minLng, maxLng] = boundsKey.split(':').map(Number);
    const fetchBounds = { minLat, maxLat, minLng, maxLng };
    let isCancelled = false;

    const loadShops = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchShopsByBounds(fetchBounds);
        if (!isCancelled) {
          setShops(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[useShopsByBounds] Failed to load shops:', err);
          setError(
            err instanceof Error
              ? err.message
              : '가게 정보를 불러올 수 없습니다.'
          );
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
  }, [boundsKey]);

  return {
    shops,
    loading,
    error,
  };
}
