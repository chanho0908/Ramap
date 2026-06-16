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
- Supabase CLI (선택사항, 로컬 개발용)

### 설치

```bash
# 저장소 클론
git clone https://github.com/chanho0908/Ramap.git
cd Ramap

# 개발 브랜치로 전환
git checkout develop

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어서 필요한 값 입력
```

### Supabase 설정

#### 옵션 1: Supabase Cloud 사용
1. [Supabase](https://supabase.com/)에 가입
2. 새 프로젝트 생성
3. 프로젝트 설정에서 API URL과 anon key 복사
4. `.env.local`에 값 입력

#### 옵션 2: Supabase 로컬 개발 환경
```bash
# Supabase CLI 설치
brew install supabase/tap/supabase  # macOS
# 또는 다른 OS: https://supabase.com/docs/guides/cli

# Supabase 로컬 시작
supabase start

# 마이그레이션 적용 (자동으로 적용됨)
# 로컬 Supabase Studio: http://localhost:54323
```

### Kakao Map API 키 발급
1. [Kakao Developers](https://developers.kakao.com/)에 가입
2. 애플리케이션 추가
3. 웹 플랫폼 등록 (http://localhost:3000)
4. JavaScript 키를 `.env.local`의 `NEXT_PUBLIC_KAKAO_MAP_KEY`에 입력

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

## 다음 단계

프로젝트 초기 설정이 완료되었습니다! 다음과 같은 순서로 개발을 진행할 예정입니다:

1. **지도 기능 구현** (Phase 2)
   - Kakao Map SDK 통합
   - 현재 위치 기반 지도 표시
   - 라멘집 마커 표시

2. **데이터 관리** (Phase 2)
   - 라멘집 목록 API 구현
   - 라멘집 상세 페이지
   - Supabase와 연동

3. **리뷰 시스템** (Phase 3)
   - 리뷰 작성/조회 기능
   - 사진 업로드
   - 별점 시스템

4. **체크인 기능** (Phase 3)
   - 방문 기록 저장
   - 방문 통계 표시

## 로드맵

### Phase 1: 프로젝트 초기화 ✅ 완료
- [x] Git 저장소 설정 및 컨벤션 문서화
- [x] Turborepo 모노레포 구조 설정
- [x] Next.js 15 웹 앱 초기화
- [x] Expo 모바일 앱 초기화
- [x] 공유 패키지 구조 및 타입 정의
- [x] Supabase 스키마 설계

### Phase 2: 지도 & 검색 기능 - 다음 단계
- [ ] Kakao Map API 통합
- [ ] 위치 기반 검색 UI
- [ ] 라멘집 목록 표시
- [ ] 라멘집 상세 페이지
- [ ] 웹/앱 간 지도 컴포넌트 조율

### Phase 3: 리뷰 & 체크인 시스템
- [ ] 리뷰 작성 폼
- [ ] 사진 업로드 (Supabase Storage)
- [ ] 리뷰 목록 및 정렬
- [ ] 체크인 기능
- [ ] 방문 통계 대시보드

### Phase 4: 최적화 & 배포
- [ ] 성능 최적화
- [ ] SEO 최적화
- [ ] PWA 지원
- [ ] 앱 스토어 제출 준비
- [ ] 배포 및 모니터링

## 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.

## 문의

- **이슈**: [GitHub Issues](https://github.com/chanho0908/Ramap/issues)
- **디스커션**: [GitHub Discussions](https://github.com/chanho0908/Ramap/discussions)

---

Made with ❤️ for ramen lovers
