/**
 * React Native Maps 컴포넌트
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import type { Shop, Location } from '@ramap/shared';
import { CustomMarkerIcon } from './CustomMarker';

interface ShopMapViewProps {
  center: Location;
  shops: Shop[];
  onMarkerPress?: (shop: Shop) => void;
}

/**
 * React Native Maps를 사용한 지도 컴포넌트
 *
 * @example
 * ```tsx
 * <ShopMapView
 *   center={{ lat: 37.5665, lng: 126.9780 }}
 *   shops={shops}
 *   onMarkerPress={(shop) => console.log(shop.name)}
 * />
 * ```
 */
export function ShopMapView({
  center,
  shops,
  onMarkerPress,
}: ShopMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {/* 지도 */}
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={() => setIsLoading(false)}
        showsUserLocation
        showsMyLocationButton
      >
        {/* 가게 마커 */}
        {shops.map((shop, index) => (
          <Marker
            key={shop.id}
            coordinate={{
              latitude: shop.location.lat,
              longitude: shop.location.lng,
            }}
            onPress={() => {
              setSelectedShopId(shop.id);
              onMarkerPress?.(shop);
            }}
            tracksViewChanges={false}
          >
            {/* 커스텀 마커 아이콘 */}
            <CustomMarkerIcon
              shop={shop}
              isSelected={selectedShopId === shop.id}
              animationDelay={index * 50}
            />

            {/* 개선된 Callout (정보창) */}
            <Callout onPress={() => onMarkerPress?.(shop)}>
              <View style={styles.callout}>
                {/* 헤더 */}
                <View style={styles.calloutHeader}>
                  <Text style={styles.calloutTitle}>🍜 {shop.name}</Text>
                  {shop.kakaoRating && shop.kakaoRating > 0 && (
                    <View style={styles.calloutRating}>
                      <Text style={styles.calloutRatingText}>
                        ⭐ {shop.kakaoRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 주소 */}
                <Text style={styles.calloutText}>📍 {shop.address}</Text>

                {/* 전화번호 */}
                {shop.phone && (
                  <Text style={styles.calloutText}>📞 {shop.phone}</Text>
                )}

                {/* 영업시간 */}
                {shop.businessHours && (
                  <Text style={styles.calloutText}>🕒 {shop.businessHours}</Text>
                )}

                {/* 인스타그램 */}
                {shop.instagramUrl && (
                  <Text style={styles.calloutInstagram}>📷 Instagram</Text>
                )}

                {/* 상세보기 힌트 */}
                <Text style={styles.calloutHint}>탭하여 상세보기</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
        </View>
      )}

      {/* 가게 수 표시 */}
      {shops.length > 0 && (
        <View style={styles.shopCount}>
          <Text style={styles.shopCountText}>
            <Text style={styles.shopCountNumber}>{shops.length}</Text>개의 가게
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  callout: {
    padding: 12,
    minWidth: 220,
    maxWidth: 320,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  calloutRating: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  calloutRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  calloutText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
    lineHeight: 18,
  },
  calloutInstagram: {
    fontSize: 12,
    color: '#8b5cf6',
    marginTop: 6,
    fontWeight: '500',
  },
  calloutHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  shopCount: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopCountText: {
    fontSize: 14,
    color: '#374151',
  },
  shopCountNumber: {
    fontWeight: 'bold',
    color: '#111827',
  },
});
