# a11y-fixer

KWCAG 2.2 기반 웹 접근성 오류를 소스 파일에서 직접 탐지하고 자동 수정하는 로컬 CLI 도구.
AI API 호출 없음. 완전 오프라인 동작. 파견 현장 보안 환경 대응.

## 기술 스택

- TypeScript (strict mode)
- pnpm workspaces (모노레포)
- cheerio — HTML 파싱 및 수정
- @babel/parser + @babel/traverse + @babel/generator — JSX/TSX AST 조작
- postcss — CSS 색상 대비 수정
- commander.js — CLI 프레임워크
- playwright + axe-core — 수정 후 재검증 전용
- tsup — 빌드
- vitest — 테스트

## 패키지 구조

```
packages/
  core/      # Rule Engine, 파서, Violation 타입, 분류기
  cli/       # npx a11y-fixer 진입점
  reporter/  # diff, manual-queue.json, PDF 리포트 생성
rules/       # 규칙 정의 (KWCAG 2.2 매핑)
tests/       # 규칙별 픽스처 (before.html / after.html)
```

## 명령어

```bash
pnpm dev          # 워크스페이스 전체 watch 빌드
pnpm build        # 전체 빌드
pnpm test         # vitest 전체 실행
pnpm test:rule    # 규칙별 픽스처 테스트만
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

CLI 직접 실행:

```bash
node packages/cli/dist/index.js scan ./src --env html
node packages/cli/dist/index.js fix ./src --dry-run
node packages/cli/dist/index.js fix ./src --out ./fixed
node packages/cli/dist/index.js verify --url https://staging.example.com
node packages/cli/dist/index.js fix ./src --from-elens ./elens-export.json
```

## 핵심 타입 (packages/core/src/types.ts 기준)

```ts
Grade = 'A' | 'B' | 'C'
// A: 자동 수정 가능 (90%+ 신뢰도)
// B: 수정 제안만, 사람 승인 필요
// C: 자동화 불가, manual-queue 진입

Env = 'html' | 'jsx' | 'tsx' | 'vue'

RuleDefinition { id, kwcag, grade, description, fix: { html?, jsx? } }
Violation { ruleId, grade, file, selector, line?, fixable, suggestion? }
FixResult { file, violations, fixedCount, skippedCount, diff }
```

## 절대 하지 말 것

- **원본 파일 덮어쓰기 금지** — 수정 결과는 반드시 `--out` 경로 또는 `fixed/` 폴더에만 출력
- **AI API 호출 금지** — 외부 네트워크 의존성 없이 순수 로컬 동작 유지
- **Grade A 규칙에 맥락 판단 로직 금지** — 신뢰도 90% 이하 케이스는 무조건 Grade B로 내려야 함
- **JSX 컴포넌트 추적 금지** — `<Image />`가 실제 `<img>`인지 판단하지 말 것. 리터럴 JSX 태그만 처리

## IMPORTANT

- 규칙 하나 추가 시 **반드시 before/after 픽스처 테스트를 먼저 작성**하고 통과시킨 뒤 구현
- 수정 전 `dry-run` 출력은 사람이 읽을 수 있어야 함 (파일명 + 변경 줄 수 + 오류 유형)
- `manual-queue.json` 스키마는 `packages/core/src/types.ts`의 `Violation[]` 그대로 직렬화

## 이렌즈 연동 (선택적)

`--from-elens ./elens-export.json` 플래그 사용 시 이렌즈 진단 JSON을 읽어 수정 우선순위에 반영.
이렌즈 JSON 포맷은 `Violation[]` 타입과 동일한 스키마를 따름.
이 플래그 없이도 CLI는 독립적으로 완전 동작해야 함.

## 참고 문서

- @docs/PRD.md — 전체 제품 요구사항
- @docs/rules-registry.md — 규칙 목록 및 KWCAG 2.2 매핑
- @docs/fixture-guide.md — 픽스처 테스트 작성 가이드

