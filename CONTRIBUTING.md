# Contributing Guide

## 프로젝트 개요
라멘 오타쿠를 위한 전국 라멘 지도 서비스

## 브랜치 전략 (Git Flow)

### 주요 브랜치
- `main`: 프로덕션 배포 브랜치 (항상 안정적인 상태 유지)
- `develop`: 개발 통합 브랜치 (다음 릴리스를 위한 기능 통합)

### 보조 브랜치
- `feature/*`: 새로운 기능 개발
  - 예: `feature/map-integration`, `feature/review-system`
  - `develop`에서 분기, `develop`으로 병합

- `release/*`: 릴리스 준비
  - 예: `release/v1.0.0`
  - `develop`에서 분기, `main`과 `develop`으로 병합

- `hotfix/*`: 긴급 버그 수정
  - 예: `hotfix/map-crash-fix`
  - `main`에서 분기, `main`과 `develop`으로 병합

### 브랜치 작업 흐름

```bash
# 새 기능 개발
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 작업 후 develop에 병합
git checkout develop
git merge --no-ff feature/your-feature-name
git push origin develop
git branch -d feature/your-feature-name
```

## 커밋 메시지 컨벤션 (Conventional Commits)

### 기본 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅, 세미콜론 누락 등 (코드 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 추가 또는 수정
- `chore`: 빌드 프로세스, 라이브러리 업데이트 등
- `perf`: 성능 개선
- `ci`: CI/CD 설정 변경

### Scope (선택사항)
- `web`: 웹 앱 관련
- `mobile`: 모바일 앱 관련
- `api`: API/백엔드 관련
- `shared`: 공유 코드 관련
- `ui`: UI 컴포넌트 관련
- `map`: 지도 기능 관련
- `review`: 리뷰 시스템 관련
- `auth`: 인증 관련

### 예시
```bash
feat(map): add Kakao Map integration

- Kakao Map SDK 통합
- 현재 위치 기반 지도 표시
- 마커 클릭 이벤트 처리

Closes #12
```

```bash
fix(review): resolve image upload failure on mobile

사진 업로드 시 발생하던 CORS 에러 수정
Supabase Storage 정책 업데이트

Fixes #45
```

```bash
docs: update README with setup instructions
```

### 커밋 메시지 작성 규칙
1. subject는 50자 이내로 간결하게
2. subject는 명령문으로 작성 (add, fix, update)
3. subject 끝에 마침표 금지
4. body는 72자마다 줄바꿈
5. body는 "무엇을", "왜" 변경했는지 설명
6. footer에 이슈 번호 참조 (Closes #123, Fixes #456)

## 코드 스타일

### TypeScript
- **네이밍 컨벤션**
  - 변수/함수: camelCase
  - 클래스/타입/인터페이스: PascalCase
  - 상수: UPPER_SNAKE_CASE
  - 파일명: kebab-case.ts 또는 PascalCase.tsx (컴포넌트)

- **타입 선언**
  ```typescript
  // interface 사용 (확장 가능한 객체 타입)
  interface Shop {
    id: string;
    name: string;
    location: Location;
  }

  // type 사용 (유니온, 인터섹션 등)
  type ShopStatus = 'open' | 'closed' | 'unknown';
  ```

### React/Next.js
- 함수형 컴포넌트 사용
- Hooks 사용 권장
- Props 타입은 interface로 정의

```typescript
interface ShopCardProps {
  shop: Shop;
  onPress: () => void;
}

export function ShopCard({ shop, onPress }: ShopCardProps) {
  // ...
}
```

### 파일 구조
```
apps/
  web/
    app/              # Next.js App Router
      (routes)/
      components/     # 페이지별 컴포넌트
      layout.tsx

  mobile/
    app/              # Expo Router
      (tabs)/
      components/     # 화면별 컴포넌트
      _layout.tsx

packages/
  shared/
    api/              # API 클라이언트
    types/            # 공유 타입
    utils/            # 유틸리티 함수

  ui/                 # 공유 UI 컴포넌트 (선택적)
```

## 코드 품질 도구

### ESLint
- TypeScript 린팅
- React/Next.js 규칙 적용
- 자동 수정 가능한 문제는 `--fix` 옵션으로 수정

```bash
npm run lint        # 린트 검사
npm run lint:fix    # 자동 수정
```

### Prettier
- 코드 포맷팅 자동화
- 저장 시 자동 포맷팅 권장

```bash
npm run format      # 전체 포맷팅
```

## Pull Request 가이드

### PR 제목
커밋 메시지 컨벤션과 동일한 형식 사용
```
feat(map): add shop detail modal
```

### PR 설명 템플릿
```markdown
## 변경 사항
- [ ] 기능 추가/수정/삭제 설명

## 테스트
- [ ] 로컬 테스트 완료
- [ ] 주요 테스트 시나리오 확인

## 스크린샷 (UI 변경 시)
[스크린샷 또는 GIF]

## 관련 이슈
Closes #123
```

### PR 체크리스트
- [ ] 코드가 컨벤션을 따르는가?
- [ ] 린트/포맷 검사를 통과했는가?
- [ ] 불필요한 console.log가 없는가?
- [ ] 주석이 적절한가?
- [ ] 타입 에러가 없는가?

## 리뷰 가이드

### 리뷰어
- 코드 품질, 로직, 성능을 검토
- 건설적인 피드백 제공
- 승인 전 충분한 검토

### 작성자
- 리뷰 코멘트에 성실히 응답
- 요청된 변경사항 반영
- 불필요한 커밋은 squash

## 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/chanho0908/Ramap.git
cd Ramap

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev:web      # 웹 개발 서버
npm run dev:mobile   # 모바일 개발 서버
```

## 문의
- 이슈: https://github.com/chanho0908/Ramap/issues
- 디스커션: https://github.com/chanho0908/Ramap/discussions
