import type { MarkerConfig } from '../types';

/**
 * 지도 마커 설정 상수
 */
export const MARKER_CONFIG: MarkerConfig = {
  size: {
    width: 40,
    height: 45,
  },
  colors: {
    default: '#FF4444', // 빨간색 (라면 브랜드 컬러)
    hover: '#FF6666', // 밝은 빨간색
    selected: '#CC0000', // 진한 빨간색
  },
  zIndex: {
    default: 1,
    hover: 10,
    selected: 20,
  },
};

/**
 * 마커 툴팁 설정
 */
export const TOOLTIP_CONFIG = {
  offset: {
    x: 0,
    y: -10, // 마커 위쪽으로 10px
  },
  maxWidth: 200,
  padding: '8px 12px',
  fontSize: '14px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  color: '#FFFFFF',
  zIndex: 100,
};

/**
 * 평점 배지 설정
 */
export const RATING_BADGE_CONFIG = {
  size: 20, // 직경
  fontSize: '10px',
  backgroundColor: '#FFFFFF',
  borderColor: '#DDDDDD',
  borderWidth: 1,
  offset: {
    x: 8, // 마커 우측으로
    y: -8, // 마커 위쪽으로
  },
};
