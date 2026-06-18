import { useEffect, useState } from 'react';
import { fetchNearbyShops } from '@ramap/shared';
import type { Location, Shop } from '@ramap/shared';

interface UseNearbyShopsResult {
  shops: Shop[];
  loading: boolean;
  error: string | null;
}

export function useNearbyShops(
  center: Location,
  radiusKm: number = 5
): UseNearbyShopsResult {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lat, lng } = center;

  useEffect(() => {
    const loadShops = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNearbyShops({ lat, lng }, radiusKm);
        setShops(data);
      } catch (err) {
        console.error('[useNearbyShops] Failed to load shops:', err);
        setError(
          err instanceof Error
            ? err.message
            : '가게 정보를 불러올 수 없습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadShops();
  }, [lat, lng, radiusKm]);

  return {
    shops,
    loading,
    error,
  };
}
