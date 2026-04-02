# PRD — a11y-fixer

**버전**: 0.1  
**작성일**: 2026-04  
**소유자**: 호영 (eTribe UX 그룹장)  
**상태**: 설계 중

---

## 1. 배경 및 문제 정의

### 현재 상황

eTribe 접근성 사업부는 고객사 웹사이트의 KWCAG 2.2 인증을 지원한다. 진단 도구(이렌즈 크롬 확장, Playwright+axe-core 자동 검사)는 이미 운영 중이다.

### 해결해야 할 문제

1. **진단과 수정 사이의 수동 공백**: 오류를 발견해도 실제 코드 수정은 담당자가 수동으로 해야 한다. 파일당 20~50개 오류가 나오는 대형 프로젝트에서는 수정에만 수일이 소요된다.
2. **보안 제약**: 파견 나가는 대기업 현장 대부분이 외부 네트워크 차단 또는 AI 서비스 접근 불가 환경이다. ChatGPT, Claude API 등 사용 불가.
3. **환경 다양성**: HTML, JSP, React(JSX/TSX), Vue 등 클라이언트별 기술 스택이 다르다. 단일 툴로 대응해야 한다.
4. **납품 품질 증명**: 수정 후 실제로 오류가 해소됐다는 검증 리포트가 없으면 고객사 설득이 어렵다.

### 목표

> "파견 현장에서 소스 파일만 있으면 AI 없이 접근성 오류의 ~60%를 자동 수정하고, 나머지는 수동 처리 큐로 분류하여 납품 리포트까지 생성한다."

---

## 2. 사용자 및 사용 맥락

### Primary User

**접근성 프로젝트 담당자 (파견 직원)**

- 역할: eTribe에서 고객사에 파견되어 접근성 개선 작업 수행
- 환경: 고객사 내부망, 외부 인터넷 차단 가능성 높음
- 기술 수준: 웹 퍼블리셔 ~ 프론트엔드 주니어. CLI 기본 사용 가능, AST 조작 불가
- 필요한 것: 명령어 하나로 실행, 무슨 파일이 어떻게 바뀌는지 확인 후 적용

### Secondary User

**접근성 사업부 리더 (호영)**

- 역할: 툴 개발 및 프로세스 설계, 납품 리포트 검토
- 필요한 것: 자동화율, 잔여 수동 항목 현황 파악

---

## 3. 범위

### In Scope (v0.1 — MVP)

- HTML 파일 파싱 및 Grade A 규칙 자동 수정
- JSX/TSX 파일 AST 기반 Grade A 규칙 자동 수정
- dry-run 모드 (수정 미적용 미리보기)
- `fixed/` 폴더 출력 (원본 무결성 보장)
- diff 출력 (파일별 변경사항)
- `manual-queue.json` 생성 (Grade B/C 목록)
- Playwright+axe-core 재검증 (수정 후 통과 여부)
- 이렌즈 JSON 선택적 입력 (`--from-elens`)

### Out of Scope (v0.1)

- Vue/Svelte 파일 지원
- CSS 색상 대비 자동 수정 (Grade B로 분류)
- PDF 리포트 자동 생성 (v0.2 예정)
- GUI / 웹 대시보드
- 동적 SPA 렌더링 접근성 (axe-core 재검증으로 커버)
- 컴포넌트 추적 (`<MyButton />`이 실제로 `<button>`인지 판단)

---

## 4. 기능 요구사항

### 4-1. CLI 인터페이스

```
npx a11y-fixer <command> [options]

Commands:
  scan <path>     소스 파일 분석 (수정 없음, 오류 목록 출력)
  fix <path>      오류 자동 수정 및 결과 출력
  verify          수정 후 URL 기반 axe-core 재검증

Options (fix):
  --env <type>         html | jsx | tsx | auto (기본: auto)
  --dry-run            파일 수정 없이 변경사항 미리보기
  --out <dir>          수정 파일 출력 경로 (기본: ./fixed)
  --from-elens <file>  이렌즈 JSON으로 우선순위 보정
  --grade <A|A,B>      처리할 Grade 범위 (기본: A)
  --page <file>        특정 파일만 처리

Options (verify):
  --url <url>          재검증할 스테이징 URL
  --out-report <file>  검증 결과 JSON 저장 경로
```

### 4-2. Rule Engine

#### Grade 분류 기준

| Grade | 정의 | 처리 방식 |
|-------|------|----------|
| A | 맥락 판단 없이 규칙만으로 수정 가능, 신뢰도 90%+ | 자동 수정 |
| B | 수정 방향은 명확하나 사람 확인 필요 | 제안만 출력, manual-queue 진입 |
| C | 자동화 불가, 시각·의미론적 판단 필요 | manual-queue 진입 |

#### 구현 대상 규칙 (우선순위 순)

| 순위 | Rule ID | KWCAG | Grade | HTML | JSX |
|------|---------|-------|-------|------|-----|
| 1 | `html-lang` | 4.1.2 | A | ✅ | ✅ |
| 2 | `img-alt` | 1.1.1 | A | ✅ | ✅ |
| 3 | `input-label` | 1.3.1 | A | ✅ | ✅ |
| 4 | `button-name` | 4.1.2 | A | ✅ | ✅ |
| 5 | `duplicate-id` | 4.1.1 | A | ✅ | ✅ |
| 6 | `tabindex-positive` | 2.4.3 | A | ✅ | ✅ |
| 7 | `link-blank-rel` | 보안 | A | ✅ | ✅ |
| 8 | `div-onclick-role` | 4.1.2 | A | ✅ | ✅ |
| 9 | `table-scope` | 1.3.1 | A | ✅ | — |
| 10 | `empty-link` | 2.4.4 | B | ✅ | ✅ |
| 11 | `color-contrast` | 1.4.3 | B | ✅ | — |
| 12 | `heading-order` | 1.3.1 | C | — | — |
| 13 | `focus-trap` | 2.1.2 | C | — | — |

#### img-alt 처리 세부 규칙

- `alt` 속성 자체가 없으면 `alt=""` 삽입 (장식 이미지 처리)
- 파일명 기반 대체텍스트 생성 **하지 않음** (맥락 판단 불가, Grade B)
- `role="presentation"` 또는 `aria-hidden="true"` 이미 있는 경우 스킵

### 4-3. 파서 레이어

```
input file
  └─ .html, .htm  → cheerio 파서 → Rule 적용 → $.html() 출력
  └─ .jsx, .tsx   → @babel/parser → traverse → @babel/generator 출력
  └─ .vue         → (v0.2, Out of Scope)
```

**JSX 파서 주의사항**:
- `@babel/parser` 옵션: `plugins: ['jsx', 'typescript']`
- 컴포넌트 import 추적 없음 — 리터럴 JSX 엘리먼트(`<img>`, `<button>` 등)만 처리
- 원본 포맷 보존: `retainLines: true`, `concise: false`

### 4-4. 출력 형식

#### dry-run 콘솔 출력 (사람이 읽을 수 있어야 함)

```
[SCAN] src/pages/main.html
  ✓ Grade A — img-alt: 3개 수정 예정 (line 12, 34, 67)
  ✓ Grade A — html-lang: 1개 수정 예정 (line 1)
  ⚠ Grade B — empty-link: 2개 → manual-queue 진입
  ✗ Grade C — heading-order: 1개 → manual-queue 진입

Summary: 4개 자동 수정 / 3개 수동 처리 필요
```

#### manual-queue.json

```json
[
  {
    "ruleId": "empty-link",
    "grade": "B",
    "file": "src/pages/main.html",
    "selector": "a:nth-child(3)",
    "line": 45,
    "fixable": false,
    "suggestion": "링크 텍스트 또는 aria-label 추가 필요. 연결된 페이지 맥락 확인 후 작성."
  }
]
```

---

## 5. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 오프라인 동작 | 외부 네트워크 없이 완전 동작 (verify 단계 제외) |
| 원본 안전성 | 원본 파일 절대 덮어쓰기 금지 |
| 처리 속도 | 파일 100개 기준 30초 이내 |
| 수정 신뢰도 | Grade A 규칙 자동 수정 후 axe-core 재검증 통과율 95%+ |
| 설치 | `npx a11y-fixer` 또는 `npm install -g a11y-fixer`로 즉시 사용 |
| Node.js 버전 | 18+ |

---

## 6. 시스템 아키텍처

```
a11y-fixer/ (pnpm workspace monorepo)
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types.ts          # Grade, Env, RuleDefinition, Violation, FixResult
│   │   │   ├── classifier.ts     # 파일 환경 자동 감지
│   │   │   ├── parsers/
│   │   │   │   ├── html.parser.ts    # cheerio 기반
│   │   │   │   └── jsx.parser.ts     # Babel AST 기반
│   │   │   └── engine.ts         # 규칙 적용 오케스트레이터
│   │   └── package.json
│   │
│   ├── cli/
│   │   ├── src/
│   │   │   ├── index.ts          # commander 진입점
│   │   │   ├── commands/
│   │   │   │   ├── scan.ts
│   │   │   │   ├── fix.ts
│   │   │   │   └── verify.ts
│   │   │   └── elens-adapter.ts  # --from-elens JSON 파싱
│   │   └── package.json
│   │
│   └── reporter/
│       ├── src/
│       │   ├── diff.ts           # unified diff 생성
│       │   ├── queue.ts          # manual-queue.json 직렬화
│       │   └── summary.ts        # 콘솔 요약 출력
│       └── package.json
│
├── rules/
│   ├── html-lang.rule.ts
│   ├── img-alt.rule.ts
│   ├── input-label.rule.ts
│   └── ... (규칙별 1파일)
│
├── tests/
│   └── fixtures/
│       ├── img-alt/
│       │   ├── before.html
│       │   └── after.html
│       └── ... (규칙별 before/after)
│
├── CLAUDE.md
└── docs/
    ├── PRD.md                   # 이 파일
    ├── rules-registry.md
    └── fixture-guide.md
```

### 데이터 흐름

```
[입력]
  소스 파일 경로 (필수)
  이렌즈 JSON (선택, --from-elens)

[파이프라인]
  1. 파일 환경 감지 (html / jsx / tsx)
  2. 파서로 소스 파싱
  3. Rule Engine 실행 → Violation[] 생성
  4. Grade 분류: A → 자동 수정 / B,C → manual-queue
  5. dry-run: diff만 출력 / 실행: fixed/ 에 저장
  6. reporter: 콘솔 요약 + manual-queue.json

[검증 단계 (별도 실행)]
  Playwright → URL 로드 → axe-core 실행
  → 잔여 위반 0이면 PASS
  → 잔여 있으면 manual-queue 보완
```

---

## 7. 개발 단계별 계획

### Phase 1 — 뼈대 (1일)

- [x] pnpm workspace 모노레포 초기화
- [x] TypeScript + tsup 설정
- [x] `packages/core/src/types.ts` 타입 정의 확정
- [x] `packages/cli` commander 기본 구조

### Phase 2 — HTML Rule Engine MVP (5일)

- [x] cheerio HTML 파서
- [x] 우선순위 상위 5개 규칙 구현 (`html-lang`, `img-alt`, `input-label`, `button-name`, `duplicate-id`)
- [x] 규칙별 before/after 픽스처 테스트 작성 + 통과
- [x] dry-run 콘솔 출력

### Phase 3 — CLI 연결 (2일)

- [x] `fix` 커맨드 완성 (dry-run + 실제 적용)
- [x] `scan` 커맨드 (읽기 전용)
- [x] `fixed/` 폴더 출력
- [x] `manual-queue.json` 생성

### Phase 4 — JSX/TSX 지원 (5일)

- [x] Babel AST 파서 구현
- [x] Phase 2 규칙 JSX 버전 구현
- [x] TSX (TypeScript) 지원

### Phase 5 — 검증 + 추가 규칙 (3일)

- [ ] `verify` 커맨드 (Playwright + axe-core)
- [x] 나머지 Grade A 규칙 (`tabindex-positive`, `link-blank-rel`, `div-onclick-role`, `table-scope`)

### Phase 6 — 이렌즈 연동 (1일)

- [ ] `--from-elens` 플래그 구현
- [ ] 이렌즈 JSON → Violation[] 어댑터

---

## 8. 성공 지표

| 지표 | 목표 |
|------|------|
| Grade A 자동 수정 후 axe-core 재검증 통과율 | 95%+ |
| 자동 처리 가능 오류 비율 (axe-core 검출 기준) | 55~65% |
| 파일 100개 처리 속도 | 30초 이내 |
| 파견 현장 설치-실행까지 소요 시간 | 5분 이내 |
| 원본 파일 손상 사고 | 0건 |

---

## 9. 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| JSX 컴포넌트 추적 불가로 수정 누락 | 높음 | 리터럴 태그만 처리 명시, 커버리지 한계를 리포트에 표기 |
| cheerio가 깨진 HTML 구조 잘못 수정 | 중간 | dry-run 필수화, 원본 백업 옵션 추가 검토 |
| 고객사 환경에 Node 18 미설치 | 낮음 | 설치 가이드 문서화, `--no-node-modules` 바이너리 배포 검토 |
| 자동 수정이 의도치 않은 UI 변경 유발 | 중간 | Grade A 규칙 범위를 속성 수준으로만 제한 (구조 변경 금지) |

---

## 10. 미결 사항

- [ ] Vue 파일 지원 시점 결정 (v0.2? v0.3?)
- [ ] PDF 리포트 자동 생성 기술 선택 (puppeteer vs. pdfkit)
- [ ] 규칙 위반 시 정확한 줄 번호 추출 방식 (JSX AST에서 `node.loc` 사용 여부)
- [ ] 이렌즈 JSON export 포맷 최종 확정 (이렌즈 팀과 협의 필요)
