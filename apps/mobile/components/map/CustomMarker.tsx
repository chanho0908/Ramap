/**
 * 커스텀 가게 마커 컴포넌트 (React Native)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MARKER_CONFIG } from '@ramap/shared';
import type { Shop } from '@ramap/shared';

interface CustomMarkerProps {
  shop: Shop;
  isSelected?: boolean;
  animationDelay?: number;
}

/**
 * 커스텀 마커 아이콘 컴포넌트
 *
 * 라면 이모지와 평점 배지를 표시합니다.
 * 드롭 애니메이션과 바운스 효과를 포함합니다.
 */
export function CustomMarkerIcon({
  shop,
  isSelected = false,
  animationDelay = 0,
}: CustomMarkerProps) {
  const markerColor = isSelected
    ? MARKER_CONFIG.colors.selected
    : MARKER_CONFIG.colors.default;

  // 애니메이션 값
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // 마운트 시 드롭 애니메이션
  useEffect(() => {
    Animated.sequence([
      // 지연
      Animated.delay(animationDelay),
      // 드롭 + 페이드인
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [animationDelay, translateY, opacity]);

  // 선택 시 바운스 애니메이션
  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected, scale]);

  return (
    <Animated.View
      style={[
        styles.markerContainer,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      {/* 마커 핀 */}
      <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
        {/* 라면 아이콘 */}
        <Text style={styles.markerIcon}>🍜</Text>

        {/* 평점 배지 */}
        {shop.kakaoRating && shop.kakaoRating > 0 && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐{shop.kakaoRating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* 마커 하단 삼각형 */}
      <View style={[styles.markerTriangle, { borderTopColor: markerColor }]} />

      {/* 선택 효과 (선택된 마커만) */}
      {isSelected && <View style={styles.selectionRing} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // 그림자 효과 (iOS)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    // 그림자 효과 (Android)
    elevation: 5,
  },
  markerIcon: {
    fontSize: 20,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderLeftWidth: 6,
    borderTopColor: '#FF4444',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    marginTop: -1,
  },
  ratingBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    // 그림자 효과
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  selectionRing: {
    position: 'absolute',
    top: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#CC0000',
    opacity: 0.3,
  },
});
