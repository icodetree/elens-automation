---
name: a11y-fix-pipeline
description: "클라이언트 소스 디렉토리의 접근성 오류를 자동 수정하고 검증 리포트까지 생성하는 전체 파이프라인. '이 프로젝트 접근성 수정해줘', '접근성 오류 고쳐줘', 'fix 실행해줘', 소스 경로를 주며 수정을 요청할 때 반드시 이 스킬을 사용. 스캔→dry-run 확인→수정 적용→검증 3단계를 자동 조율."
---

# a11y Fix Pipeline

클라이언트 프로젝트에 a11y-fixer를 실행하여 스캔→수정→검증까지 전 과정을 자동화하는 파이프라인 스킬.

## 실행 모드: 서브 에이전트 (순차 파이프라인)

## 에이전트 구성

| 순서 | 에이전트 | subagent_type | 역할 | 출력 |
|------|---------|---------------|------|------|
| 1 | auditor | a11y-auditor | 스캔 + 위반 분석 | `_workspace/01_auditor_report.json` |
| 2 | fixer | general-purpose | dry-run + 수정 적용 | `_workspace/02_fix_result.json`, `fixed/` |
| 3 | verifier | fix-verifier | 테스트 + diff 검증 | `_workspace/03_verify_report.json` |

## 워크플로우

### Phase 1: 입력 파악

1. 사용자 입력에서 추출:
   - `targetPath`: 수정할 소스 디렉토리 (필수)
   - `fromElens?`: 이렌즈 JSON 경로
   - `stagingUrl?`: axe-core 재검증용 URL
   - `grade`: 기본 `A`
   - `dryRunReview`: 기본 `true` (dry-run 결과를 사용자에게 보여주고 승인 요청)
2. `_workspace/` 디렉토리 생성

### Phase 2: 스캔 (a11y-auditor 서브 에이전트)

```
Agent(
  subagent_type: "a11y-auditor",
  model: "opus",
  prompt: "targetPath: {path}, fromElens: {elens?}를 스캔하여 _workspace/01_auditor_report.json 생성",
  run_in_background: false
)
```

완료 후 `_workspace/01_auditor_report.json` 읽어 위반 요약 사용자에게 표시:

```
[SCAN 결과]
총 파일: 42개 | 총 위반: 137개
Grade A (자동 수정): 89개 — img-alt(45), html-lang(12), button-name(32)
Grade B/C (수동 처리): 48개

자동 수정 예상 비율: 65%
계속 진행하시겠습니까? (y/n)
```

Grade A 위반이 0이면 파이프라인 종료.

### Phase 3: Dry-run + 사용자 승인

`dryRunReview: true`인 경우:

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "node packages/cli/dist/index.js fix {targetPath} --dry-run --grade A를 실행하고 결과를 콘솔에 출력. 출력을 _workspace/02_dryrun_output.txt에도 저장.",
  run_in_background: false
)
```

dry-run 출력을 사용자에게 표시하고 **수정 적용 승인 요청**.

승인 거부 시: 파이프라인 중단, `manual-queue.json`만 생성 후 종료.

### Phase 4: 수정 적용 (general-purpose 서브 에이전트)

승인 후 실행:

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  prompt: "다음 명령을 실행하라:
    1. node packages/cli/dist/index.js fix {targetPath} --grade A --out ./fixed {fromElens? --from-elens {elens} : ''}
    2. 결과를 _workspace/02_fix_result.json에 저장:
       { fixedCount, skippedCount, files: [...], manualQueuePath }
    3. manual-queue.json이 생성됐으면 경로 기록",
  run_in_background: false
)
```

### Phase 5: 검증 (fix-verifier 서브 에이전트)

```
Agent(
  subagent_type: "fix-verifier",
  model: "opus",
  prompt: "_workspace/02_fix_result.json을 읽어 검증 수행. stagingUrl: {url?}",
  run_in_background: false
)
```

### Phase 6: 최종 보고

`_workspace/03_verify_report.json`을 읽어 최종 요약 출력:

```
[완료 리포트]
✅ 자동 수정: 89개 (Grade A)
⚠  수동 처리 필요: 48개 → manual-queue.json
🧪 테스트: PASS
📁 수정 파일: ./fixed/

다음 단계: manual-queue.json의 48개 항목을 검토하세요.
```

## 데이터 흐름

```
입력(targetPath)
     ↓
[a11y-auditor] → 01_auditor_report.json
     ↓
사용자 확인
     ↓
[general-purpose: dry-run] → 02_dryrun_output.txt
     ↓
사용자 승인
     ↓
[general-purpose: fix] → 02_fix_result.json + fixed/
     ↓
[fix-verifier] → 03_verify_report.json
     ↓
최종 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| CLI 빌드 파일 없음 | Phase 2 전 `pnpm build` 자동 실행 |
| Grade A 위반 0개 | "수정 대상 없음" 보고 후 종료 |
| dry-run 결과 이상 (구조 변경 감지) | 경고 후 사용자 판단에 맡김 |
| fix 에이전트 실패 | 1회 재시도. 재실패 시 dry-run 결과만 저장 후 종료 |
| verifier 테스트 실패 | `status: regression` 보고, fixed/ 적용 자제 권고 |

## 주의사항

- `fixed/` 디렉토리는 항상 원본과 분리. 원본 `targetPath`는 절대 수정하지 않는다.
- 이 파이프라인이 직접 파일을 수정하지 않는다. 수정은 CLI 도구가 담당.
- `_workspace/`는 보존하여 사후 감사에 활용.

## 테스트 시나리오

### 정상 흐름
1. "src/ 디렉토리 접근성 수정해줘" 요청
2. Phase 2: auditor가 45개 Grade A 위반 발견
3. Phase 3: dry-run 결과 표시 → 사용자 승인
4. Phase 4: fix 적용 → fixed/ 생성
5. Phase 5: verifier PASS
6. 결과: 45개 수정, manual-queue.json 12건

### 에러 흐름
1. Phase 5: verifier가 테스트 실패 감지 (regression)
2. `status: regression`, 실패 테스트 목록 보고
3. fixed/ 적용 보류 권고
4. 사용자가 diff 검토 후 판단
