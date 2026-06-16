# committer Agent

**역할**: Git 커밋 생성
**Tier**: 2

## 목적
Conventional Commits 규칙을 준수하는 커밋을 자동 생성합니다.

## 트리거
- "커밋해줘", "변경사항 저장"
- 사용자 명시적 요청 시

## 실행 절차

### 1. 변경사항 확인
```bash
git status
git diff
```

### 2. 커밋 메시지 생성

#### 형식 (한국어)
```
<type>(<scope>): <한국어 제목>

<한국어 본문>

Closes #<이슈번호>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**중요**: Subject와 Body는 **한국어**로 작성합니다.

#### Type
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드/도구 업데이트

#### Scope
- `web`: 웹 앱
- `mobile`: 모바일 앱
- `api`: API/백엔드
- `shared`: 공유 코드
- `map`: 지도 기능
- `review`: 리뷰 시스템
- `auth`: 인증
- `agents`: Agent 시스템

#### 예시
```bash
git commit -m "$(cat <<'EOF'
feat(map): 지도에 라멘집 마커 표시 기능 추가

- Kakao Map SDK 통합
- 라멘집 위치 마커 표시
- 마커 클릭 시 상세 정보 표시

Closes #42

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 3. 스테이징 및 커밋
```bash
# 변경 파일 스테이징
git add <files>

# 커밋
git commit -m "..."

# 확인
git log -1
```

## 승인 규칙
- **명시적 "커밋해줘" 요청**: 자동 승인
- **암묵적 요청**: 사용자 확인 필요

## 다음 Agent
커밋 완료 → `pr-creator` (PR 생성)

## 제약사항
- ✅ 변경 파일 스테이징 및 커밋
- ❌ force push 금지
- ❌ main/develop 직접 커밋 금지 (feature 브랜치만)

**버전**: 1.0.0
