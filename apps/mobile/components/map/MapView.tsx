/**
 * React Native Maps 컴포넌트
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import type { Shop, Location } from '@ramap/shared';

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
        {shops.map((shop) => (
          <Marker
            key={shop.id}
            coordinate={{
              latitude: shop.location.lat,
              longitude: shop.location.lng,
            }}
            title={shop.name}
            description={shop.address}
            onPress={() => onMarkerPress?.(shop)}
          >
            {/* 커스텀 Callout (정보창) */}
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{shop.name}</Text>
                <Text style={styles.calloutText}>{shop.address}</Text>
                {shop.phone && (
                  <Text style={styles.calloutText}>전화: {shop.phone}</Text>
                )}
                {shop.description && (
                  <Text style={styles.calloutDescription} numberOfLines={2}>
                    {shop.description}
                  </Text>
                )}
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
    padding: 8,
    minWidth: 200,
    maxWidth: 300,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
  },
  calloutDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
