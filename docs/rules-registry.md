# Rules Registry

## Grade A — 자동 수정 가능

| Rule ID | KWCAG | 설명 | HTML | JSX | 구현 상태 |
|---------|-------|------|------|-----|----------|
| html-lang | 4.1.2 | html 요소 lang 속성 없음 | ✅ | ✅ | - |
| img-alt | 1.1.1 | img alt 속성 없음 → alt="" | ✅ | ✅ | - |
| input-label | 1.3.1 | label 연결 없는 input | ✅ | ✅ | - |
...

## img-alt 처리 세부 규칙
- alt 없으면 alt="" 삽입 (장식 처리)
- role="presentation" 있으면 스킵
- 파일명 기반 대체텍스트 생성 금지 → Grade B
```

이 파일이 있으면 CLAUDE.md에 규칙 상세를 다 적을 필요가 없습니다. 필요할 때만 `@docs/rules-registry.md`로 로드됩니다.

---

## 세팅 순서 요약
```
1. pnpm workspace 초기화 (Phase 1 작업)
2. .claude/settings.json 생성 → Hook 등록
3. .mcp.json 생성 → Context7 추가
4. .claude/agents/rule-writer.md 작성
5. docs/rules-registry.md 작성
6. CLAUDE.md에 @import 추가 (이미 작성됨)