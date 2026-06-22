/**
 * 커스텀 가게 마커 컴포넌트 (React Native)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import type { Shop } from '@ramap/shared';

interface CustomMarkerProps {
  shop: Shop;
  isSelected?: boolean;
  animationDelay?: number;
}

/**
 * 커스텀 마커 아이콘 컴포넌트
 *
 * 라멘 그릇 심볼을 표시합니다.
 * 드롭 애니메이션과 바운스 효과를 포함합니다.
 */
export function CustomMarkerIcon({
  shop,
  isSelected = false,
  animationDelay = 0,
}: CustomMarkerProps) {
  const markerColor = isSelected ? '#D9412C' : '#F45B3E';

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
      accessibilityLabel={`${shop.name} 가게 위치`}
    >
      {/* 마커 핀 */}
      <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
        <View style={styles.innerBadge}>
          <View style={styles.mintArc} />

          <View style={styles.ramenIcon}>
            <View style={styles.seaweed}>
              <View style={styles.seaweedHighlight} />
            </View>
            <View style={styles.broth} />
            <View style={styles.toppingMint} />
            <View style={styles.toppingRed} />
            <View style={styles.noodleLineOne} />
            <View style={styles.noodleLineTwo} />
            <View style={styles.bowlBase}>
              <View style={styles.bowlRim} />
            </View>
            <View style={styles.steamLeft} />
            <View style={styles.steamRight} />
          </View>
        </View>
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
  innerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF4DF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mintArc: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 12,
    borderTopWidth: 3,
    borderColor: '#4DBFAE',
    borderRadius: 12,
  },
  ramenIcon: {
    position: 'absolute',
    bottom: 3,
    width: 26,
    height: 24,
    alignItems: 'center',
  },
  seaweed: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#0E2A47',
  },
  seaweedHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 3,
    height: 5,
    borderRadius: 1,
    backgroundColor: '#123B5F',
  },
  broth: {
    position: 'absolute',
    top: 8,
    width: 22,
    height: 11,
    borderRadius: 11,
    backgroundColor: '#FFE8A8',
    borderWidth: 2,
    borderColor: '#FFD98D',
  },
  toppingMint: {
    position: 'absolute',
    top: 10,
    left: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4DBFAE',
  },
  toppingRed: {
    position: 'absolute',
    top: 11,
    right: 9,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F15A36',
  },
  noodleLineOne: {
    position: 'absolute',
    top: 12,
    width: 15,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#F57C35',
  },
  noodleLineTwo: {
    position: 'absolute',
    top: 15,
    width: 13,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#F57C35',
  },
  bowlBase: {
    position: 'absolute',
    top: 15,
    width: 24,
    height: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#0E2A47',
    overflow: 'hidden',
  },
  bowlRim: {
    position: 'absolute',
    top: -4,
    left: 1,
    width: 22,
    height: 8,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFF4DF',
  },
  steamLeft: {
    position: 'absolute',
    top: 0,
    left: 7,
    width: 2,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#0E2A47',
    transform: [{ rotate: '-18deg' }],
  },
  steamRight: {
    position: 'absolute',
    top: -1,
    right: 10,
    width: 2,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#0E2A47',
    transform: [{ rotate: '18deg' }],
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
  selectionRing: {
    position: 'absolute',
    top: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#0E2A47',
    opacity: 0.3,
  },
});
