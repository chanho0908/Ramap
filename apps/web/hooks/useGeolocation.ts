/**
 * Web Geolocation API 훅
 */

import { useCallback, useState, useEffect } from 'react';
import type { Location } from '@ramap/shared';

interface UseGeolocationReturn {
  location: Location | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  requestLocation: () => void;
}

/**
 * 브라우저 Geolocation API를 사용하여 현재 위치를 가져오는 훅
 *
 * @example
 * ```tsx
 * const { location, error, loading } = useGeolocation();
 *
 * if (loading) return <div>위치 정보 가져오는 중...</div>;
 * if (error) return <div>위치 권한이 필요합니다.</div>;
 *
 * return <MapView center={location} />;
 * ```
 */
export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const requestLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: '이 브라우저는 위치 정보를 지원하지 않습니다.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('[Geolocation Error]', err);
        setError(err);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    error,
    loading,
    requestLocation,
  };
}
