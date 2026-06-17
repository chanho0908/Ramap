# 라멘집 크롤링 시스템

Kakao Places API를 사용하여 전국 라멘집 정보를 수집하고 Supabase에 저장하는 크롤링 시스템입니다.

## 📋 목차

- [개요](#개요)
- [사전 준비](#사전-준비)
- [환경 설정](#환경-설정)
- [사용법](#사용법)
- [고급 설정](#고급-설정)
- [문제 해결](#문제-해결)

## 개요

이 크롤링 시스템은 다음 기능을 제공합니다:

- ✅ **Kakao Places API 통합**: 공식 API를 사용한 안전한 데이터 수집
- ✅ **다중 키워드 검색**: "라멘", "라면", "ラーメン" 등 다양한 키워드로 검색
- ✅ **전국 범위 지원**: 서울, 부산, 대구 등 주요 도시 커버
- ✅ **데이터 검증**: 좌표 범위, 필수 필드, 중복 제거
- ✅ **배치 저장**: Supabase에 50개씩 묶어 효율적으로 저장
- ✅ **오류 처리**: 재시도 로직, 상세한 오류 로그

## 사전 준비

### 1. Kakao Developers 계정 생성 및 API 키 발급

1. [Kakao Developers](https://developers.kakao.com/)에서 계정 생성
2. "내 애플리케이션" > "애플리케이션 추가하기"로 앱 생성
3. "앱 키" 탭에서 **REST API 키** 복사
4. "플랫폼" 탭에서 웹 플랫폼 추가 (선택)

> **참고**: Kakao REST API는 무료이며, 일일 호출 한도는 충분합니다.

### 2. Supabase 프로젝트 설정

1. [Supabase Dashboard](https://app.supabase.com/)에서 프로젝트 생성 (또는 기존 프로젝트 사용)
2. 프로젝트 설정 > API에서 다음 정보 확인:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public** 키 또는 **service_role** 키 (권장)

> **중요**: 크롤링 스크립트는 서버 측에서 실행되므로 **service_role 키**를 사용하는 것이 좋습니다. (RLS 우회 가능)

## 환경 설정

### 1. 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```bash
# Kakao API
KAKAO_REST_API_KEY=your-kakao-rest-api-key-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 크롤링 옵션 (선택사항)
KAKAO_REQUEST_DELAY_MS=500        # API 요청 간 지연 (기본값: 500ms)
MAX_PAGES_PER_KEYWORD=3           # 키워드당 최대 페이지 수 (기본값: 3)
BATCH_SIZE=50                     # 배치 삽입 크기 (기본값: 50)
UPSERT_MODE=false                 # 중복 시 업데이트 여부 (기본값: false)
STRICT_MODE=false                 # 엄격한 필터링 모드 (기본값: false)
```

### 2. 의존성 설치

```bash
pnpm install
```

## 사용법

### 기본 실행

```bash
pnpm crawl:shops
```

전국 라멘집을 검색하여 Supabase에 저장합니다.

### 엄격 모드 실행

```bash
pnpm crawl:shops:strict
```

라멘 관련 키워드가 포함된 장소만 수집합니다. (더 정확한 결과)

### 테스트 실행 (Dry-Run)

```bash
pnpm crawl:shops:dry-run
```

데이터베이스에 저장하지 않고 검증만 수행합니다. 처음 실행 시 권장합니다.

### 실행 결과 예시

```
🍜 라멘집 크롤링 시작

============================================================
⚙️  크롤링 설정:
   - Kakao API Key: abcd1234ef...
   - 요청 지연: 500ms
   - 키워드당 최대 페이지: 3
   - 엄격 모드: 비활성화
   - Supabase URL: https://xxx.supabase.co
   - 배치 크기: 50
   - Upsert 모드: 비활성화

🔧 Kakao API 클라이언트 초기화...
✅ 초기화 완료

🔧 Supabase 연결 테스트...
✅ Supabase 연결 성공
   현재 DB에 0개의 Shop이 저장되어 있습니다.

🔍 총 14개의 키워드로 검색 시작...

키워드: 라멘, 라면, ラーメン, ramen, 라멘야 ...

============================================================
📡 크롤링 시작

🔍 키워드 "라멘" 검색 시작...
  페이지 1: 15개 발견 (총 15개)
  페이지 2: 15개 발견 (총 30개)
  페이지 3: 12개 발견 (총 42개)
✅ 키워드 "라멘" 검색 완료: 총 42개

...

📊 중복 제거 후 총 87개의 장소 수집됨

⏱️  크롤링 소요 시간: 32.5초

============================================================
✅ 데이터 검증 및 변환

🔍 87개의 장소 검증 시작...
✅ 검증 완료:
   - 유효: 82개
   - 무효: 3개
   - 중복: 2개

📊 검증 요약:
   총 처리: 87개
   ✅ 유효: 82개
   ❌ 무효: 3개
   🔄 중복: 2개
   📈 성공률: 96.5%

============================================================
📤 Supabase에 82개 Shop 저장 시작...
   배치 크기: 50개
   Upsert 모드: 비활성화

  배치 1/2: 50개 처리 중...
    ✅ 성공: 50개, ❌ 실패: 0개
  배치 2/2: 32개 처리 중...
    ✅ 성공: 32개, ❌ 실패: 0개

✅ 저장 완료:
   - 성공: 82개
   - 실패: 0개

============================================================
🎉 크롤링 완료!

📊 최종 통계:
   - 크롤링: 87개
   - 검증 통과: 82개
   - DB 저장 성공: 82개
   - DB 저장 실패: 0개
   - 현재 총 Shop 수: 82개

⏱️  총 소요 시간: 35.2초
============================================================
```

## 고급 설정

### 환경 변수 상세 설명

| 변수 | 설명 | 기본값 | 예시 |
|------|------|--------|------|
| `KAKAO_REST_API_KEY` | Kakao REST API 키 (필수) | - | `abcd1234efgh...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (필수) | - | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role 키 (권장) | - | `eyJhbGci...` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon 키 (대체) | - | `eyJhbGci...` |
| `KAKAO_REQUEST_DELAY_MS` | API 요청 간 지연 (ms) | 500 | 1000 |
| `MAX_PAGES_PER_KEYWORD` | 키워드당 최대 페이지 수 | 3 | 5 |
| `BATCH_SIZE` | 배치 삽입 크기 | 50 | 100 |
| `UPSERT_MODE` | 중복 시 업데이트 여부 | false | true |
| `STRICT_MODE` | 엄격한 필터링 모드 | false | true |

### 검색 키워드 커스터마이징

`scripts/crawling/config.ts` 파일에서 검색 키워드를 수정할 수 있습니다:

```typescript
export const SEARCH_KEYWORDS = [
  '라멘',
  '라면',
  'ラーメン',
  'ramen',
  '라멘야',
  '일본라멘',
  // 여기에 추가 키워드를 입력하세요
] as const;
```

### 대상 도시 수정

주요 도시 목록도 수정 가능합니다:

```typescript
export const MAJOR_CITIES = [
  { name: '서울', keywords: ['서울 라멘', '강남 라멘', '홍대 라멘'] },
  { name: '부산', keywords: ['부산 라멘', '해운대 라멘'] },
  // 추가 도시를 입력하세요
] as const;
```

## 문제 해결

### 오류: "KAKAO_REST_API_KEY 환경 변수가 설정되지 않았습니다"

**원인**: `.env.local` 파일에 Kakao API 키가 없거나 잘못 설정됨

**해결 방법**:
1. 프로젝트 루트에 `.env.local` 파일이 있는지 확인
2. `KAKAO_REST_API_KEY=your-key` 형식으로 올바르게 설정
3. 키에 따옴표나 공백이 없는지 확인

### 오류: "Supabase 연결 실패"

**원인**: Supabase URL 또는 키가 잘못됨

**해결 방법**:
1. Supabase Dashboard에서 Project URL과 API 키를 다시 확인
2. `.env.local`에 올바른 값 설정
3. `service_role` 키를 사용하는 경우 RLS 정책 확인

### 오류: "Kakao API request failed: 401"

**원인**: Kakao API 키가 유효하지 않음

**해결 방법**:
1. Kakao Developers에서 앱이 활성화되어 있는지 확인
2. REST API 키를 다시 복사하여 `.env.local`에 붙여넣기
3. API 키에 불필요한 공백이나 문자가 없는지 확인

### 오류: "중복 키 감지"

**원인**: 이미 존재하는 데이터를 다시 삽입하려고 함

**해결 방법**:
1. `UPSERT_MODE=true` 설정하여 중복 시 업데이트
2. 또는 기존 데이터를 Supabase Studio에서 삭제 후 재실행

### 검증 실패가 너무 많은 경우

**원인**: 라멘과 무관한 장소가 많이 검색됨

**해결 방법**:
1. `--strict` 옵션 사용: `pnpm crawl:shops:strict`
2. 또는 `STRICT_MODE=true` 환경 변수 설정
3. `config.ts`에서 검색 키워드를 더 구체적으로 수정

## 파일 구조

```
scripts/crawling/
├── crawl-shops.ts       # 메인 실행 파일
├── kakao-api.ts         # Kakao Places API 클라이언트
├── data-validator.ts    # 데이터 검증 및 변환
├── db-importer.ts       # Supabase 배치 저장
├── config.ts            # 설정 파일
└── README.md            # 이 파일
```

## 라이선스

이 프로젝트는 Ramap의 일부이며, 프로젝트 루트의 라이선스를 따릅니다.

## 문의

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.
