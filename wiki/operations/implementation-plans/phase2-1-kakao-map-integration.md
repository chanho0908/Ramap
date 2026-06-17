# Phase 2-1 구현계획: Kakao 지도 연동

**작성일**: 2026-06-16
**버전**: 1.0
**담당**: AI Agent System (implementer)

---

## 1. Overview

### 1.1 목표
Ramap 웹앱과 모바일앱에 Kakao Map SDK를 통합하여 사용자가 지도 위에서 라멘 가게 위치를 시각적으로 확인할 수 있는 기본 기능을 구현합니다.

### 1.2 범위 (Scope)
**포함되는 기능:**
- Kakao Map SDK 설정 (웹: JavaScript SDK, 모바일: react-native-maps + Kakao provider)
- 현재 위치 기반 지도 중심점 설정
- Supabase에서 가게 데이터 가져오기 (위치 기반 쿼리)
- 지도 위에 가게 마커 표시
- 마커 클릭 시 간단한 정보창 (이름, 주소)

**제외되는 기능 (Phase 2-2 이후):**
- 가게 검색 및 필터링
- 마커 클러스터링
- 길찾기/네비게이션
- 가게 상세 페이지 연동
- 리뷰/체크인 기능

### 1.3 성공 기준 (Success Criteria)
- ✅ 사용자가 웹/모바일 앱에서 지도를 볼 수 있음
- ✅ 현재 위치 또는 서울 중심으로 지도가 로드됨
- ✅ Supabase shops 테이블에서 가져온 가게들이 마커로 표시됨
- ✅ 마커 클릭 시 가게 이름과 주소가 정보창에 표시됨
- ✅ 모바일에서 위치 권한 요청이 정상 작동함

---

## 2. Working Fence

### 2.1 Assumptions (가정사항)
1. **Kakao Developers에서 API 키를 발급받았음**
   - Web 앱: JavaScript 키
   - Mobile 앱: Native 앱 키 (iOS/Android 각각)
2. **Supabase shops 테이블에 최소 10개 이상의 샘플 데이터가 있음**
   - lat/lng 필드가 정확히 입력되어 있음
   - 서울/수도권 중심 데이터
3. **사용자가 위치 권한을 허용한다고 가정**
   - 거부 시 기본 위치(서울시청)로 폴백
4. **인터넷 연결이 안정적임**
   - 오프라인 모드는 Phase 3 이후

### 2.2 Simplicity (단순화 원칙)
1. **MVP 수준의 지도 기능만 구현**
   - 마커는 기본 아이콘 사용 (커스텀 아이콘은 Phase 2-3)
   - 정보창은 텍스트만 (이미지/별점은 제외)
2. **성능 최적화는 최소한으로**
   - 마커 클러스터링 없음 (50개 미만 가게만 표시)
   - 무한 스크롤/페이지네이션 없음
3. **에러 처리는 기본적으로만**
   - API 키 오류: console.error + 알림
   - 위치 권한 거부: 기본 위치로 폴백
   - 네트워크 오류: 재시도 없이 에러 메시지 표시
4. **디자인은 기능 검증 수준**
   - Tailwind 기본 스타일 사용
   - 반응형 디자인은 웹만 (모바일은 네이티브 전체화면)

### 2.3 Change Scope (변경 파일 목록)

#### 생성할 파일
**Web App (`apps/web/`):**
```
app/map/page.tsx                     # 지도 페이지 (App Router)
components/map/MapView.tsx           # Kakao 지도 컴포넌트
components/map/ShopMarker.tsx        # 가게 마커 컴포넌트
components/map/ShopInfoWindow.tsx    # 마커 정보창 컴포넌트
hooks/useGeolocation.ts              # 위치 가져오기 훅
lib/kakao-maps.ts                    # Kakao Maps SDK 초기화
```

**Mobile App (`apps/mobile/`):**
```
app/map.tsx                          # 지도 화면 (Expo Router)
components/map/MapView.tsx           # React Native Maps 컴포넌트
components/map/ShopMarker.tsx        # 가게 마커 컴포넌트
hooks/useLocation.ts                 # Expo Location 훅
```

**Shared Package (`packages/shared/`):**
```
src/api/shops.ts                     # 가게 API 함수
src/utils/location.ts                # 위치 계산 유틸 (거리 등)
```

#### 수정할 파일
```
apps/web/package.json                # Kakao Maps 타입 추가
apps/web/app/layout.tsx              # Kakao Maps SDK 스크립트 추가
apps/mobile/package.json             # react-native-maps 의존성 추가
apps/mobile/app.json                 # iOS/Android 위치 권한 설정
packages/shared/src/api/supabase.ts  # 지리 쿼리 유틸 추가 (선택사항)
.env.example                         # Kakao API 키 예시 추가
```

### 2.4 Verification Criteria (검증 기준 체크리스트)

#### 기능 검증
- [ ] 웹앱 `/map` 경로 접속 시 지도가 렌더링됨
- [ ] 모바일앱 지도 탭 선택 시 지도가 렌더링됨
- [ ] 현재 위치를 가져와 지도 중심점으로 설정됨
- [ ] 위치 권한 거부 시 서울시청(37.5665, 126.9780)으로 폴백됨
- [ ] Supabase에서 가게 데이터를 성공적으로 가져옴
- [ ] 가게 마커가 지도 위에 정확한 좌표에 표시됨
- [ ] 마커 클릭 시 정보창이 나타남
- [ ] 정보창에 가게 이름과 주소가 정확히 표시됨
- [ ] 정보창 닫기 버튼이 작동함
- [ ] 지도 확대/축소가 정상 작동함
- [ ] 지도 드래그로 이동이 정상 작동함

#### 성능 검증
- [ ] 지도 초기 로드 시간 < 3초
- [ ] 마커 50개 렌더링 시 버벅임 없음
- [ ] 마커 클릭 반응 속도 < 500ms

#### 크로스 플랫폼 검증
- [ ] Chrome/Safari 브라우저에서 정상 작동
- [ ] iOS 시뮬레이터/실기기에서 정상 작동
- [ ] Android 에뮬레이터/실기기에서 정상 작동
- [ ] 모바일 가로/세로 모드 모두 정상 작동

#### 에러 처리 검증
- [ ] Kakao API 키 미설정 시 에러 메시지 표시
- [ ] Supabase 연결 실패 시 에러 메시지 표시
- [ ] 가게 데이터가 없을 때 빈 지도 표시
- [ ] 네트워크 연결 끊김 시 사용자에게 알림

---

## 3. Implementation Steps

### Step 1: Kakao Map SDK 설정

#### 1.1 Web App 설정
**작업 내용:**
1. Kakao Developers에서 JavaScript 키 발급
2. `apps/web/.env.local`에 키 추가:
   ```bash
   NEXT_PUBLIC_KAKAO_MAP_KEY=your_javascript_key_here
   ```
3. `apps/web/app/layout.tsx`에 SDK 스크립트 추가:
   ```tsx
   <script
     type="text/javascript"
     src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`}
   />
   ```
4. `apps/web/lib/kakao-maps.ts` 생성 - SDK 초기화 함수 작성

**검증:**
- `window.kakao` 객체가 정상적으로 로드됨
- console에 Kakao Maps 에러가 없음

#### 1.2 Mobile App 설정
**작업 내용:**
1. `react-native-maps` 설치:
   ```bash
   cd apps/mobile
   pnpm add react-native-maps
   ```
2. iOS 설정 (`apps/mobile/app.json`):
   ```json
   "ios": {
     "infoPlist": {
       "NSLocationWhenInUseUsageDescription": "Ramap이 주변 라멘 가게를 찾기 위해 위치 정보가 필요합니다."
     }
   }
   ```
3. Android 설정 (`apps/mobile/app.json`):
   ```json
   "android": {
     "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
   }
   ```
4. Kakao Map Provider 설정 (또는 Google Maps 사용)

**검증:**
- `react-native-maps` import가 정상 작동
- iOS/Android 빌드 에러 없음

---

### Step 2: 위치 서비스 설정

#### 2.1 Web - Geolocation API 훅 작성
**파일**: `apps/web/hooks/useGeolocation.ts`

**인터페이스**:
```typescript
export function useGeolocation() {
  return {
    location: Location | null;
    error: GeolocationPositionError | null;
    loading: boolean;
    requestLocation: () => void;
  };
}
```

**기능**:
- `navigator.geolocation.getCurrentPosition()` 래핑
- 권한 거부 시 기본 위치 반환
- 에러 상태 관리

#### 2.2 Mobile - Expo Location 훅 작성
**파일**: `apps/mobile/hooks/useLocation.ts`

**작업 내용**:
1. `expo-location` 설치
2. 권한 요청 함수 작성
3. 위치 가져오기 함수 작성

**인터페이스**:
```typescript
export function useLocation() {
  return {
    location: Location | null;
    error: string | null;
    loading: boolean;
    requestPermission: () => Promise<boolean>;
  };
}
```

**검증:**
- 위치 권한 요청 다이얼로그가 나타남
- 허용 시 정확한 좌표가 반환됨
- 거부 시 기본 위치(서울시청)로 폴백됨

---

### Step 3: Shop API 함수 작성

**파일**: `packages/shared/src/api/shops.ts`

#### 3.1 fetchNearbyShops 함수
```typescript
export async function fetchNearbyShops(
  location: Location,
  radiusKm: number = 5
): Promise<Shop[]> {
  // Supabase PostGIS 쿼리
  // ST_DWithin 또는 간단한 lat/lng 범위 쿼리
}
```

**구현 방식:**
1. **옵션 A (간단)**: Bounding box 쿼리
   ```sql
   SELECT * FROM shops
   WHERE lat BETWEEN :minLat AND :maxLat
     AND lng BETWEEN :minLng AND :maxLng
   ```

2. **옵션 B (정확)**: PostGIS ST_DWithin 사용
   ```sql
   SELECT * FROM shops
   WHERE ST_DWithin(
     geography(ST_MakePoint(lng, lat)),
     geography(ST_MakePoint(:userLng, :userLat)),
     :radiusMeters
   )
   ```

**MVP 권장**: 옵션 A (PostGIS 확장 불필요)

#### 3.2 Utility 함수
**파일**: `packages/shared/src/utils/location.ts`

```typescript
// 두 좌표 간 거리 계산 (Haversine formula)
export function calculateDistance(
  from: Location,
  to: Location
): number;

// Bounding box 계산
export function getBoundingBox(
  center: Location,
  radiusKm: number
): { minLat, maxLat, minLng, maxLng };
```

**검증:**
- 5km 반경 내 가게만 반환됨
- 반환된 가게의 좌표가 유효함 (null 체크)
- 빈 배열 처리가 정상 작동함

---

### Step 4: Map 컴포넌트 작성

#### 4.1 Web - MapView 컴포넌트
**파일**: `apps/web/components/map/MapView.tsx`

**Props**:
```typescript
interface MapViewProps {
  center: Location;
  shops: Shop[];
  onMarkerClick?: (shop: Shop) => void;
}
```

**구현 내용**:
```typescript
'use client';

export function MapView({ center, shops, onMarkerClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  useEffect(() => {
    // Kakao Maps SDK 초기화
    // 지도 생성
    // 마커 렌더링
  }, [center, shops]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {selectedShop && (
        <ShopInfoWindow
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
        />
      )}
    </div>
  );
}
```

#### 4.2 Web - ShopMarker 컴포넌트
**파일**: `apps/web/components/map/ShopMarker.tsx`

**역할**: Kakao Maps Marker 객체 생성 및 이벤트 핸들링

```typescript
export function createShopMarker(
  map: kakao.maps.Map,
  shop: Shop,
  onClick: (shop: Shop) => void
): kakao.maps.Marker {
  const position = new kakao.maps.LatLng(shop.location.lat, shop.location.lng);
  const marker = new kakao.maps.Marker({ position, map });

  kakao.maps.event.addListener(marker, 'click', () => onClick(shop));

  return marker;
}
```

#### 4.3 Web - ShopInfoWindow 컴포넌트
**파일**: `apps/web/components/map/ShopInfoWindow.tsx`

**UI**:
```tsx
<div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
  <button onClick={onClose} className="absolute top-2 right-2">✕</button>
  <h3 className="font-bold text-lg">{shop.name}</h3>
  <p className="text-sm text-gray-600">{shop.address}</p>
  {shop.phone && <p className="text-sm">{shop.phone}</p>}
</div>
```

#### 4.4 Mobile - MapView 컴포넌트
**파일**: `apps/mobile/components/map/MapView.tsx`

```tsx
import MapView, { Marker, Callout } from 'react-native-maps';

export function ShopMapView({ center, shops, onMarkerPress }) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {shops.map(shop => (
        <Marker
          key={shop.id}
          coordinate={{
            latitude: shop.location.lat,
            longitude: shop.location.lng,
          }}
          onPress={() => onMarkerPress(shop)}
        >
          <Callout>
            <View>
              <Text style={{ fontWeight: 'bold' }}>{shop.name}</Text>
              <Text>{shop.address}</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}
```

**검증:**
- 지도가 올바른 중심점으로 렌더링됨
- 마커가 정확한 위치에 표시됨
- 마커 클릭 시 정보창이 나타남
- 정보창 닫기가 정상 작동함

---

### Step 5: 페이지 통합 및 데이터 연결

#### 5.1 Web - Map Page
**파일**: `apps/web/app/map/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchNearbyShops } from '@ramap/shared';
import type { Shop } from '@ramap/shared';

const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.9780 }; // 서울시청

export default function MapPage() {
  const { location, error, loading } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);

  const center = location || DEFAULT_LOCATION;

  useEffect(() => {
    if (center) {
      setIsLoadingShops(true);
      fetchNearbyShops(center, 5)
        .then(setShops)
        .catch(console.error)
        .finally(() => setIsLoadingShops(false));
    }
  }, [center]);

  if (loading) return <div>위치 정보 가져오는 중...</div>;
  if (error) return <div>위치 권한이 필요합니다. 기본 위치로 표시합니다.</div>;

  return (
    <div className="h-screen">
      <MapView center={center} shops={shops} />
      {isLoadingShops && <LoadingOverlay />}
    </div>
  );
}
```

#### 5.2 Mobile - Map Screen
**파일**: `apps/mobile/app/map.tsx`

```tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ShopMapView } from '@/components/map/MapView';
import { useLocation } from '@/hooks/useLocation';
import { fetchNearbyShops } from '@ramap/shared';

const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.9780 };

export default function MapScreen() {
  const { location, requestPermission } = useLocation();
  const [shops, setShops] = useState([]);

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    const center = location || DEFAULT_LOCATION;
    fetchNearbyShops(center, 5).then(setShops);
  }, [location]);

  return (
    <View style={{ flex: 1 }}>
      <ShopMapView
        center={location || DEFAULT_LOCATION}
        shops={shops}
        onMarkerPress={(shop) => console.log('Pressed:', shop.name)}
      />
    </View>
  );
}
```

#### 5.3 Navigation 연결
- Web: 네비게이션 바에 "지도" 링크 추가 (`/map`)
- Mobile: 탭 네비게이션에 "지도" 탭 추가

**검증:**
- 페이지 접속 시 모든 기능이 통합되어 작동함
- 위치 → API 호출 → 마커 렌더링 전체 플로우가 정상 작동함

---

## 4. Testing Strategy

### 4.1 Unit Tests
**도구**: Jest + React Testing Library

**테스트 대상**:
- `useGeolocation` 훅 - 위치 가져오기, 에러 처리
- `fetchNearbyShops` API 함수 - Supabase 쿼리 모킹
- `calculateDistance` 유틸 - 거리 계산 정확도
- `getBoundingBox` 유틸 - 경계 박스 계산

**예시**:
```typescript
// packages/shared/src/utils/__tests__/location.test.ts
describe('calculateDistance', () => {
  it('should calculate distance between Seoul and Busan', () => {
    const seoul = { lat: 37.5665, lng: 126.9780 };
    const busan = { lat: 35.1796, lng: 129.0756 };
    const distance = calculateDistance(seoul, busan);
    expect(distance).toBeCloseTo(325, 0); // ~325km
  });
});
```

### 4.2 Component Tests
**테스트 대상**:
- `MapView` - 마커 렌더링, 클릭 이벤트
- `ShopInfoWindow` - 정보 표시, 닫기 버튼

**모킹**:
- Kakao Maps SDK는 모킹 필요
- Supabase client는 MSW로 모킹

### 4.3 Integration Tests (선택사항)
**도구**: Playwright (web) / Detox (mobile)

**시나리오**:
1. 지도 페이지 접속
2. 위치 권한 허용
3. 지도 로드 확인
4. 마커 클릭
5. 정보창 표시 확인

### 4.4 Manual Testing Checklist
- [ ] Chrome DevTools에서 위치 모킹 테스트
- [ ] Safari에서 위치 권한 테스트
- [ ] iOS 실기기에서 위치 권한 테스트
- [ ] Android 실기기에서 위치 권한 테스트
- [ ] 네트워크 오프라인 시 에러 처리 확인
- [ ] Supabase 연결 실패 시 에러 처리 확인

---

## 5. Deployment Checklist

### 5.1 환경 변수 설정
**Web (Vercel)**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_KAKAO_MAP_KEY=your_javascript_key
```

**Mobile (EAS Build)**:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 5.2 Kakao Developers 설정
1. **플랫폼 등록**:
   - Web: `https://ramap.com`, `http://localhost:3000`
   - iOS: Bundle ID 등록
   - Android: Package name + SHA-1 키 등록

2. **API 호출 허용**:
   - JavaScript 키: 도메인 화이트리스트 설정
   - Native 앱 키: 번들 ID/패키지명 등록

### 5.3 Supabase 데이터 준비
1. **샘플 데이터 삽입** (최소 10개 가게):
   ```sql
   INSERT INTO shops (name, address, lat, lng, description)
   VALUES
     ('이치란 라멘 서울', '서울시 강남구 ...', 37.5012, 127.0396, '도톤보리 스타일'),
     -- ... 9개 더
   ```

2. **인덱스 확인**:
   ```sql
   CREATE INDEX idx_shops_location ON shops(lat, lng);
   ```

3. **RLS 정책 확인**:
   - `SELECT on shops`: public read 허용됨

### 5.4 빌드 검증
```bash
# Web
cd apps/web
pnpm build
pnpm start  # 프로덕션 모드 확인

# Mobile
cd apps/mobile
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

### 5.5 성능 체크
- Lighthouse 점수 확인 (Performance > 80)
- 지도 초기 로드 < 3초
- 마커 50개 렌더링 시 FPS > 30

### 5.6 모니터링 설정 (선택사항)
- Sentry: 에러 트래킹
- Vercel Analytics: 웹 성능 모니터링
- Expo Application Services: 크래시 리포팅

---

## 6. Rollback Plan

### 6.1 문제 시나리오별 대응

#### 시나리오 1: Kakao Maps SDK 로드 실패
**증상**: `window.kakao` undefined, 지도가 렌더링 안 됨
**원인**: API 키 오류, 도메인 미등록, 네트워크 이슈
**대응**:
1. 에러 메시지 표시: "지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요."
2. 폴백: 정적 이미지 지도 또는 리스트 뷰로 전환
3. Sentry에 에러 로깅

#### 시나리오 2: Supabase 연결 실패
**증상**: fetchNearbyShops가 빈 배열 반환 또는 에러
**원인**: Supabase 서버 다운, 네트워크 문제, RLS 정책 오류
**대응**:
1. 에러 메시지 표시: "가게 정보를 불러올 수 없습니다."
2. Retry 버튼 제공 (최대 3회)
3. 실패 시 이전 캐시 데이터 사용 (있다면)

#### 시나리오 3: 위치 권한 거부
**증상**: Geolocation API 에러
**대응**:
1. 안내 메시지: "위치 권한을 허용하면 주변 가게를 찾을 수 있습니다."
2. 기본 위치(서울시청)로 지도 표시
3. 수동 위치 검색 기능 제공 (Phase 2-2)

#### 시나리오 4: 성능 이슈 (마커가 너무 많음)
**증상**: 지도가 버벅이거나 렌더링 느림
**대응**:
1. 즉시: 마커 개수 제한 (최대 50개)
2. 단기: 마커 클러스터링 구현 (Phase 2-3으로 이동)
3. 장기: 서버 사이드 필터링 + 페이지네이션

### 6.2 Feature Flag (선택사항)
**Phase 2-1 기능을 실험적으로 배포할 경우**:
```typescript
// lib/featureFlags.ts
export const FEATURE_FLAGS = {
  enableMapView: process.env.NEXT_PUBLIC_ENABLE_MAP === 'true',
};

// app/map/page.tsx
if (!FEATURE_FLAGS.enableMapView) {
  return <ComingSoonPage />;
}
```

### 6.3 긴급 롤백 절차
1. **Vercel (Web)**: 이전 배포 버전으로 롤백 (1-click)
2. **EAS (Mobile)**:
   - Over-the-air 업데이트로 이전 버전 푸시
   - 또는 App Store/Play Store에서 이전 버전 재배포
3. **Git**: `git revert` 커밋 생성 후 재배포

---

## 7. Appendix

### 7.1 참고 문서
- [Kakao Maps API - Web](https://apis.map.kakao.com/web/)
- [react-native-maps 문서](https://github.com/react-native-maps/react-native-maps)
- [Expo Location 문서](https://docs.expo.dev/versions/latest/sdk/location/)
- [Supabase PostGIS 가이드](https://supabase.com/docs/guides/database/extensions/postgis)

### 7.2 코드 컨벤션
- 파일명: PascalCase for components, kebab-case for utils
- 컴포넌트: Named exports preferred
- API 함수: `fetch*`, `create*`, `update*`, `delete*` 접두사
- 타입: `@ramap/shared` 패키지의 타입 재사용

### 7.3 다음 단계 (Phase 2-2)
- 가게 검색 기능 (키워드, 카테고리)
- 필터링 (별점, 거리, 영업 중)
- 마커 클러스터링
- 가게 상세 페이지 연동

---

**문서 끝**
