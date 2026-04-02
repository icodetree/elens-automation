---
name: rule-dev-sprint
description: "KWCAG 접근성 규칙 여러 개를 한 번에 병렬로 구현할 때 반드시 사용. 규칙 추가 요청(예: 'tabindex-positive, link-blank-rel 규칙 추가해줘', '남은 규칙 전부 구현해줘')이 들어오면 이 스킬을 즉시 실행. rule-writer 에이전트들을 팬아웃 패턴으로 병렬 실행하여 픽스처+코드+테스트를 동시에 완성한다."
---

# Rule Dev Sprint

여러 접근성 규칙을 병렬 구현하는 팬아웃 오케스트레이터.
rule-writer 에이전트를 규칙 수만큼 동시에 스폰하여 픽스처 작성→코드 구현→테스트 통과를 한 번에 완료한다.

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 |
|------|-------------|------|
| rule-writer-{N} | rule-writer | 규칙 1개 전담 구현 |

팀원 수 = 구현할 규칙 수. 최대 5개 동시 실행 권장.

## 워크플로우

### Phase 1: 준비

1. 구현 대상 규칙 목록 확인:
   - 사용자가 명시한 rule-id 목록
   - 또는 `docs/rules-registry.md`와 `rules/index.ts`를 비교해 미구현 규칙 추출
2. `rules/index.ts` 읽어 이미 등록된 규칙 제외
3. `_workspace/` 디렉토리 생성

### Phase 2: 팀 구성 및 병렬 실행

규칙별로 팀원 생성:

```
TeamCreate(
  team_name: "rule-dev-sprint",
  members: [
    {
      name: "rule-writer-{rule-id}",
      agent_type: "rule-writer",
      model: "opus",
      prompt: "다음 규칙을 구현하라. rule-id: {rule-id}, kwcag: {kwcag}, description: {desc}. 완료 후 결과를 리더에게 SendMessage로 보고하라."
    },
    // 규칙 수만큼 반복
  ]
)
```

작업 등록:

```
TaskCreate(tasks: [
  { title: "{rule-id} 구현", description: "픽스처 + 코드 + 테스트", assignee: "rule-writer-{rule-id}" },
  // 규칙 수만큼
])
```

### Phase 3: 병렬 구현 모니터링

- 팀원들이 독립적으로 작업 수행 (규칙별 디렉토리 분리로 충돌 없음)
- 유휴 알림 수신 시: 해당 팀원의 완료/실패 상태 확인
- 실패 팀원 발생 시: 원인 확인 후 재시작 또는 Grade B 분류

### Phase 4: 통합 및 rules/index.ts 업데이트

모든 팀원 완료 후:

1. 성공한 규칙들을 `rules/index.ts`에 등록:
   ```ts
   import {ruleId}Rule from './{rule-id}.rule.js';
   // allRules 배열에 추가
   ```
2. `pnpm test` 전체 실행하여 회귀 없음 확인
3. `_workspace/sprint_summary.md` 생성

### Phase 5: 정리

1. 팀 해체 (TeamDelete)
2. 결과 요약 보고:
   - 완료: N개 규칙 구현, 테스트 PASS
   - Grade B 분류: M개 규칙 (이유 포함)
   - 실패: K개 규칙 (원인 포함)

## 데이터 흐름

```
[리더: 규칙 목록 분석]
        ↓
[TeamCreate: rule-writer × N]
        ↓ (병렬)
[rule-writer-A] [rule-writer-B] [rule-writer-C]
        ↓               ↓               ↓
  fixture+rule     fixture+rule     fixture+rule
        ↓               ↓               ↓
        └───────── [리더: index.ts 업데이트] ─────────┘
                         ↓
                   pnpm test (전체)
                         ↓
                   sprint_summary.md
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 팀원 1개 실패 | 1회 재시작. 재실패 시 Grade B 분류 후 계속 |
| 팀원 테스트 실패 3회 | "자동화 불가" 보고, 해당 규칙 스킵 |
| index.ts 충돌 | 성공 규칙만 순차 등록 |

## 테스트 시나리오

### 정상 흐름
1. "tabindex-positive, link-blank-rel, div-onclick-role 추가해줘" 요청
2. Phase 1: 3개 모두 미구현 확인
3. Phase 2: rule-writer 3개 병렬 시작
4. Phase 3: 각자 독립 구현 (~3분)
5. Phase 4: index.ts에 3개 등록, pnpm test PASS
6. 결과: 3개 규칙 구현 완료

### 에러 흐름
1. rule-writer-div-onclick-role이 Grade B 분류 필요 판단
2. 해당 팀원이 리더에게 "Grade B 판단" SendMessage 발송
3. 리더가 Grade B로 기록하고 나머지 2개 완료 대기
4. 최종 보고: 2개 완료, 1개 Grade B 분류
