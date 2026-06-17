/**
 * 지도 화면 (Mobile)
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { ShopMapView } from '@/components/map/MapView';
import { useLocation } from '@/hooks/useLocation';
import { fetchNearbyShops, type Shop } from '@ramap/shared';

// 기본 위치: 서울시청
const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 };

export default function MapScreen() {
  const { location, error: locationError, requestPermission } = useLocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);

  // 중심 위치: 현재 위치 또는 기본 위치
  const center = location || DEFAULT_LOCATION;

  // 초기 권한 요청
  useEffect(() => {
    requestPermission();
  }, []);

  // 가게 데이터 가져오기
  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        setShopsError(null);
        const data = await fetchNearbyShops(center, 5); // 5km 반경
        setShops(data);
      } catch (err) {
        console.error('[Map Screen] Failed to load shops:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : '가게 정보를 불러올 수 없습니다.';
        setShopsError(errorMessage);
        Alert.alert('오류', errorMessage);
      } finally {
        setIsLoadingShops(false);
      }
    };

    loadShops();
  }, [center.lat, center.lng]);

  // 위치 에러 알림
  useEffect(() => {
    if (locationError && !location) {
      Alert.alert(
        '위치 권한 필요',
        '주변 가게를 찾기 위해 위치 권한이 필요합니다. 기본 위치(서울)로 표시합니다.',
        [{ text: '확인' }]
      );
    }
  }, [locationError, location]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ramap</Text>
          <Text style={styles.headerSubtitle}>주변 라멘 가게 {shops.length}곳</Text>
        </View>
        {locationError && !location && (
          <View style={styles.locationBadge}>
            <Text style={styles.locationBadgeText}>기본 위치</Text>
          </View>
        )}
      </View>

      {/* 지도 */}
      <View style={styles.mapContainer}>
        <ShopMapView
          center={center}
          shops={shops}
          onMarkerPress={(shop) => {
            console.log('[Map Screen] Marker pressed:', shop.name);
            // Phase 2-2: 상세 페이지 이동
            // navigation.navigate('ShopDetail', { shopId: shop.id });
          }}
        />

        {/* 가게 로딩 오버레이 */}
        {isLoadingShops && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>가게 검색 중...</Text>
            </View>
          </View>
        )}

        {/* 가게 없음 메시지 */}
        {!isLoadingShops && !shopsError && shops.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🍜</Text>
              <Text style={styles.emptyTitle}>주변에 가게가 없습니다</Text>
              <Text style={styles.emptyText}>
                다른 지역을 검색하거나 지도를 이동해보세요.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  locationBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationBadgeText: {
    fontSize: 12,
    color: '#d97706',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14,
    color: '#374151',
  },
  emptyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    maxWidth: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
