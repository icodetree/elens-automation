import type { RuleDefinition } from '@a11y-fixer/core';

// Phase 2에서 구현될 규칙들
// import { htmlLangRule } from './html-lang.rule.js';
// import { imgAltRule } from './img-alt.rule.js';
// import { inputLabelRule } from './input-label.rule.js';
// import { buttonNameRule } from './button-name.rule.js';
// import { duplicateIdRule } from './duplicate-id.rule.js';

/**
 * 모든 규칙 목록
 */
export const rules: RuleDefinition[] = [
  // Phase 2에서 추가 예정
];

/**
 * 규칙 ID로 규칙 조회
 */
export function getRule(id: string): RuleDefinition | undefined {
  return rules.find((r) => r.id === id);
}

/**
 * Grade로 규칙 필터링
 */
export function getRulesByGrade(grade: 'A' | 'B' | 'C'): RuleDefinition[] {
  return rules.filter((r) => r.grade === grade);
}
