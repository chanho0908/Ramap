# Ramap (라맵) 🍜

라멘 오타쿠(라오타)를 위한 전국 라멘 지도 서비스

## 프로젝트 소개

Ramap은 라멘을 사랑하는 사람들을 위한 지도 기반 라멘 맛집 정보 공유 플랫폼입니다.
위치 기반 검색, 리뷰, 체크인 기능을 통해 전국의 숨은 라멘 맛집을 발견하고 공유할 수 있습니다.

### 주요 기능
- 🗺️ **지도 기반 검색**: 현재 위치 주변의 라멘 맛집 찾기
- ⭐ **리뷰 시스템**: 별점, 사진, 텍스트 리뷰 작성
- ✅ **체크인/방문 기록**: 방문한 라멘집 기록 및 통계
- 📱 **크로스 플랫폼**: 웹과 모바일 앱 모두 지원
- 🔓 **로그인 불필요**: 익명으로도 모든 기능 이용 가능

## 기술 스택

### 프론트엔드
- **웹**: Next.js 15 (App Router) + React 18 + TypeScript
- **모바일**: Expo (React Native)
- **스타일링**: Tailwind CSS / NativeWind
- **상태 관리**: Zustand / TanStack Query

### 백엔드
- **BaaS**: Supabase
  - PostgreSQL Database
  - Realtime Subscriptions
  - Storage (이미지)
  - Edge Functions

### 지도 API
- **한국**: Kakao Map API
- **일본** (추후): Google Maps API

### 개발 도구
- **모노레포**: Turborepo
- **패키지 관리**: pnpm
- **린팅**: ESLint
- **포맷팅**: Prettier
- **타입 체크**: TypeScript

## 프로젝트 구조

```
Ramap/
├── apps/
│   ├── web/              # Next.js 웹 앱
│   │   ├── app/          # App Router
│   │   ├── components/   # 웹 컴포넌트
│   │   └── public/       # 정적 파일
│   └── mobile/           # Expo 모바일 앱
│       ├── app/          # Expo Router
│       └── components/   # 모바일 컴포넌트
├── packages/
│   ├── shared/           # 공유 비즈니스 로직
│   │   ├── api/          # Supabase API
│   │   ├── types/        # TypeScript 타입
│   │   └── utils/        # 유틸리티
│   └── ui/               # 공유 UI (선택적)
├── supabase/
│   ├── migrations/       # DB 마이그레이션
│   └── functions/        # Edge Functions
├── CONTRIBUTING.md       # 기여 가이드
└── README.md
```

## 시작하기

### 사전 요구사항
- Node.js 18 이상
- pnpm 8 이상
- Git

### 설치

```bash
# 저장소 클론
git clone https://github.com/chanho0908/Ramap.git
cd Ramap

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 필요한 값 입력
```

### 개발 서버 실행

```bash
# 웹 개발 서버
pnpm dev:web

# 모바일 개발 서버
pnpm dev:mobile

# 모든 앱 동시 실행
pnpm dev
```

### 빌드

```bash
# 웹 빌드
pnpm build:web

# 모바일 빌드
pnpm build:mobile

# 전체 빌드
pnpm build
```

## 환경 변수

필요한 환경 변수는 각 앱의 `.env.example` 파일을 참고하세요.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Kakao Map API
NEXT_PUBLIC_KAKAO_MAP_KEY=your-kakao-map-key
```

## 기여하기

프로젝트에 기여하고 싶으시다면 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.

### 개발 워크플로우
1. 이슈 확인 또는 생성
2. `develop` 브랜치에서 `feature/*` 브랜치 생성
3. 코드 작성 및 커밋 (Conventional Commits)
4. Pull Request 생성
5. 코드 리뷰 및 병합

## 로드맵

### Phase 1: MVP (v0.1.0) - 진행 중
- [x] 프로젝트 셋업
- [ ] 기본 UI/UX 설계
- [ ] 지도 통합 (Kakao Map)
- [ ] 라멘집 목록 및 상세
- [ ] 리뷰 시스템
- [ ] 체크인 기능

### Phase 2: 개선 (v0.2.0)
- [ ] 검색 필터 고도화
- [ ] 이미지 최적화
- [ ] 성능 개선
- [ ] PWA 지원

### Phase 3: 확장 (v0.3.0)
- [ ] 일본 지역 지원
- [ ] 소셜 기능 (팔로우, 피드)
- [ ] 추천 알고리즘
- [ ] 다국어 지원

## 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.

## 문의

- **이슈**: [GitHub Issues](https://github.com/chanho0908/Ramap/issues)
- **디스커션**: [GitHub Discussions](https://github.com/chanho0908/Ramap/discussions)

---

Made with ❤️ for ramen lovers
