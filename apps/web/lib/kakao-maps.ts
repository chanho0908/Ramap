/**
 * Kakao Maps SDK 초기화 및 유틸리티 함수
 */

declare global {
  interface Window {
    kakao: any;
  }
}

/**
 * Kakao Maps SDK가 로드되었는지 확인
 * LatLng 클래스가 실제로 사용 가능한지까지 확인
 */
export function isKakaoMapsLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.kakao &&
    window.kakao.maps &&
    typeof window.kakao.maps.LatLng !== 'undefined'
  );
}

/**
 * Kakao Maps SDK 초기화
 * @returns Promise<void> SDK 로드 완료 시 resolve
 */
export function loadKakaoMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있으면 즉시 resolve
    if (isKakaoMapsLoaded()) {
      console.log('[Kakao Maps] Already loaded');
      resolve();
      return;
    }

    // window.kakao가 있지만 maps가 없는 경우 (autoload=false)
    if (typeof window !== 'undefined' && window.kakao) {
      console.log('[Kakao Maps] Loading maps...');
      try {
        window.kakao.maps.load(() => {
          console.log('[Kakao Maps] Loaded successfully');
          resolve();
        });
      } catch (error) {
        console.error('[Kakao Maps] Load error:', error);
        reject(error);
      }
      return;
    }

    // SDK 스크립트가 아직 로드되지 않은 경우 - 재시도
    console.log('[Kakao Maps] SDK not found, waiting...');

    let retries = 0;
    const maxRetries = 20; // 최대 10초 대기

    const checkInterval = setInterval(() => {
      retries++;

      if (isKakaoMapsLoaded()) {
        // 이미 완전히 로드됨
        clearInterval(checkInterval);
        console.log('[Kakao Maps] SDK already loaded (retry)');
        resolve();
      } else if (window.kakao && window.kakao.maps) {
        // kakao.maps 객체는 있지만 아직 초기화 안 됨
        clearInterval(checkInterval);
        console.log('[Kakao Maps] SDK found, loading...');
        window.kakao.maps.load(() => {
          console.log('[Kakao Maps] Loaded successfully');
          resolve();
        });
      } else if (retries >= maxRetries) {
        clearInterval(checkInterval);
        console.error('[Kakao Maps] SDK load timeout');
        reject(new Error('Kakao Maps SDK 로드 시간 초과. API 키를 확인하세요.'));
      }
    }, 500);
  });
}

/**
 * Kakao Maps API 키가 설정되어 있는지 확인
 */
export function hasKakaoMapKey(): boolean {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  return Boolean(key && key !== 'your-kakao-map-key');
}

/**
 * Kakao Maps 에러 처리
 */
export function handleKakaoMapError(error: Error): void {
  console.error('[Kakao Maps Error]', error);

  // Sentry 등 에러 트래킹 서비스에 로깅 (추후 추가)
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error);
  // }
}
