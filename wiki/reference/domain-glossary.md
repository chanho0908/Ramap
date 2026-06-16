# 도메인 용어집 (Domain Glossary)

---
authority: canonical
---

**Ramap 프로젝트의 공식 도메인 용어 정의**

모든 코드, 문서, 커밋 메시지, PR에서 이 용어를 일관되게 사용합니다.

---

## 핵심 엔티티

### Shop (라멘집)
**정의**: 라멘을 판매하는 가게

**속성**:
- `id`: 고유 식별자
- `name`: 가게 이름
- `address`: 주소
- `location`: 위치 (위도/경도)
- `description`: 설명 (선택)
- `phone`: 전화번호 (선택)
- `businessHours`: 영업시간 (선택)

**코드 표현**:
```typescript
interface Shop {
  id: string;
  name: string;
  address: string;
  location: Location;
  description?: string;
  phone?: string;
  businessHours?: string;
  createdAt: string;
  updatedAt: string;
}
```

**사용 예시**:
- "라멘집 목록 조회"
- "Shop 상세 페이지"
- `fetchShops()`, `ShopCard.tsx`

---

### Review (리뷰)
**정의**: 사용자가 라멘집에 남기는 평가

**속성**:
- `id`: 고유 식별자
- `shopId`: 라멘집 ID
- `userId`: 작성자 ID (익명 가능)
- `rating`: 별점 (1-5)
- `content`: 리뷰 내용
- `photos`: 사진 URL 배열

**코드 표현**:
```typescript
interface Review {
  id: string;
  shopId: string;
  userId?: string;
  rating: number; // 1-5
  content: string;
  photos: string[];
  createdAt: string;
}
```

**사용 예시**:
- "리뷰 작성 폼"
- "Review 목록"
- `createReview()`, `ReviewCard.tsx`

---

### Checkin (체크인)
**정의**: 사용자가 라멘집을 방문한 기록

**속성**:
- `id`: 고유 식별자
- `shopId`: 라멘집 ID
- `userId`: 사용자 ID (익명 가능)
- `visitedAt`: 방문 시간
- `notes`: 메모 (선택)

**코드 표현**:
```typescript
interface Checkin {
  id: string;
  shopId: string;
  userId?: string;
  visitedAt: string;
  notes?: string;
}
```

**사용 예시**:
- "체크인 버튼"
- "방문 기록"
- `createCheckin()`, `CheckinButton.tsx`

---

### User (사용자)
**정의**: Ramap을 사용하는 사람 (선택적 계정)

**속성**:
- `id`: 고유 식별자
- `nickname`: 닉네임
- `profileImage`: 프로필 이미지 (선택)

**코드 표현**:
```typescript
interface User {
  id: string;
  nickname: string;
  profileImage?: string;
  createdAt: string;
}
```

**참고**:
- 로그인 없이도 리뷰/체크인 가능 (익명)
- 계정 생성은 선택사항

---

### Location (위치)
**정의**: 지리적 좌표 (위도/경도)

**속성**:
- `lat`: 위도 (Latitude)
- `lng`: 경도 (Longitude)

**코드 표현**:
```typescript
interface Location {
  lat: number;  // 37.5665 (예: 서울)
  lng: number;  // 126.9780
}
```

**사용 예시**:
- "현재 위치"
- "Shop 위치"
- `MapView`, `useLocation()`

---

## 기능 용어

### Map (지도)
**정의**: 라멘집 위치를 시각화하는 지도 화면

**관련 컴포넌트**:
- `MapView`: 지도 표시
- `ShopMarker`: 라멘집 마커
- `MapControls`: 지도 컨트롤

**사용 예시**:
- "지도에 마커 표시"
- "Map 페이지"

---

### Marker (마커)
**정의**: 지도 위에 표시되는 라멘집 위치 핀

**사용 예시**:
- "Shop 마커 클릭"
- "마커 표시"

---

### Search (검색)
**정의**: 위치 기반으로 라멘집을 찾는 기능

**타입**:
- Location-based: 위치 중심 검색
- Filter: 필터링 (추후 추가)

**사용 예시**:
- "주변 라멘집 검색"
- "Search 기능"

---

## 기술 용어

### Supabase
**정의**: 백엔드 서비스 (BaaS)

**역할**:
- PostgreSQL 데이터베이스
- Storage (이미지 저장)
- Realtime (실시간 업데이트)

---

### Kakao Map API
**정의**: 한국 지도 서비스 API

**사용처**:
- 웹 앱의 지도 표시
- 장소 검색

---

### Expo
**정의**: React Native 개발 프레임워크

**사용처**:
- 모바일 앱 개발

---

## 명명 규칙

### 파일명
```
ShopCard.tsx          # 컴포넌트
shop-utils.ts         # 유틸리티
fetchShops.test.ts    # 테스트
```

### 함수명
```typescript
// API 함수: fetch + 복수형
fetchShops()
fetchReviews()

// 생성: create
createReview()
createCheckin()

// 업데이트: update
updateShop()

// 삭제: delete
deleteReview()
```

### 컴포넌트명
```typescript
// 엔티티 컴포넌트: [Entity] + 역할
ShopCard
ShopList
ShopDetail

// 기능 컴포넌트: 역할 + [Feature]
ReviewForm
CheckinButton
MapView
```

---

## 금지 용어

### ❌ 사용 금지
- "Store" → `Shop` 사용
- "Rating" → `Review` (별점 포함)
- "Visit" → `Checkin` (명시적)
- "Restaurant" → `Shop` (라멘집만)

---

## 용어 추가 절차

1. `wiki/inbox/`에 새 용어 제안
2. Agent가 코드에서 사용 빈도 확인
3. 3회 이상 사용 시 공식 용어 승격
4. 이 문서에 추가

---

**최종 업데이트**: 2026-06-16
**버전**: 1.0.0
