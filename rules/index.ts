import type { RuleDefinition, Grade } from '@a11y-fixer/core';
import { htmlLangRule } from './html-lang.rule.js';
import { imgAltRule } from './img-alt.rule.js';
import { inputLabelRule } from './input-label.rule.js';
import { buttonNameRule } from './button-name.rule.js';
import { duplicateIdRule } from './duplicate-id.rule.js';

/**
 * 모든 규칙 목록 (우선순위 순)
 */
export const rules: RuleDefinition[] = [
  htmlLangRule,
  imgAltRule,
  inputLabelRule,
  buttonNameRule,
  duplicateIdRule,
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
export function getRulesByGrade(grade: Grade): RuleDefinition[] {
  return rules.filter((r) => r.grade === grade);
}

/**
 * 개별 규칙 export
 */
export {
  htmlLangRule,
  imgAltRule,
  inputLabelRule,
  buttonNameRule,
  duplicateIdRule,
};
