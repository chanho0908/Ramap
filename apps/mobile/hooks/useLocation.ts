/**
 * Expo Location API 훅
 */

import { useState, useEffect } from 'react';
import * as ExpoLocation from 'expo-location';
import type { Location } from '@ramap/shared';

interface UseLocationReturn {
  location: Location | null;
  error: string | null;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Expo Location API를 사용하여 현재 위치를 가져오는 훅
 *
 * @example
 * ```tsx
 * const { location, error, loading, requestPermission } = useLocation();
 *
 * useEffect(() => {
 *   requestPermission();
 * }, []);
 *
 * if (loading) return <ActivityIndicator />;
 * if (error) return <Text>{error}</Text>;
 *
 * return <MapView center={location} />;
 * ```
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const requestPermission = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // 위치 권한 요청
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.');
        setLoading(false);
        return false;
      }

      // 현재 위치 가져오기
      const currentLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      setLocation({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      });
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Location Error]', err);
      setError(
        err instanceof Error ? err.message : '위치 정보를 가져올 수 없습니다.'
      );
      setLoading(false);
      return false;
    }
  };

  // 초기 마운트 시 권한 확인
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      if (status === 'granted') {
        requestPermission();
      } else {
        setLoading(false);
      }
    };

    checkPermission();
  }, []);

  return {
    location,
    error,
    loading,
    requestPermission,
  };
}
