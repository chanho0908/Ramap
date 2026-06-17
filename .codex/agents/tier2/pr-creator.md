# pr-creator Agent

**역할**: Pull Request 생성
**Tier**: 2

## 목적
변경사항을 develop 브랜치로 병합하기 위한 PR을 생성합니다.

## 트리거
- "PR 만들어줘", "Pull Request 생성"
- committer 완료 후 사용자 요청 시

## 실행 절차

### 1. 브랜치 상태 확인
```bash
# 현재 브랜치
git branch --show-current

# develop과의 차이
git diff develop...HEAD

# 커밋 히스토리
git log develop..HEAD --oneline
```

### 2. 원격 푸시
```bash
git push -u origin feature/42-add-shop-markers
```

### 3. PR 생성
```bash
gh pr create \
  --base develop \
  --head feature/42-add-shop-markers \
  --title "feat(map): add shop markers on map" \
  --body "$(cat <<'EOF'
## 변경 사항
- Kakao Map SDK 통합
- 라멘집 위치 마커 표시
- 마커 클릭 시 간단한 정보 표시

## 테스트
- [x] 로컬 테스트 완료
- [x] 타입 에러 없음
- [x] 지도 렌더링 정상

## 스크린샷
[스크린샷 첨부 예정]

## 체크리스트
- [x] 코딩 컨벤션 준수
- [x] 테스트 작성 완료
- [x] console.log 제거
- [x] 타입 에러 없음

## 관련 이슈
Closes #42

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --draft
```

### 4. PR URL 반환
사용자에게 PR 링크를 제공합니다.

## PR 템플릿

```markdown
## Summary
간결한 변경사항 요약 (1-2문장)

## 주요 변경사항
- 변경사항 1
- 변경사항 2
- 변경사항 3

## 스크린샷 (UI 변경 시)
[웹/모바일 스크린샷]

## Related Issues
Closes #<issue-number>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**주의사항**:
- ❌ **Notes 섹션 추가 금지** (PR 크기, 의존성, 다음 단계 등)
- ❌ **Test Plan 섹션 추가 금지** (테스트는 코드 리뷰에서 확인)
- ✅ Summary는 간결하게 (1-2문장)
- ✅ 주요 변경사항만 명확히

## Draft PR 규칙
- **초기 생성**: 항상 Draft로 시작
- **사용자 리뷰**: GitHub에서 추가 확인
- **최종 병합**: 사용자가 수동으로 진행

## 승인 규칙
- PR 생성: 사용자 승인 필요
- PR 병합: **AI는 절대 병합하지 않음**

## 제약사항
- ✅ Draft PR 생성
- ✅ 원격 브랜치 push
- ❌ PR 자동 병합 금지
- ❌ main/develop 직접 push 금지

**버전**: 1.0.0
