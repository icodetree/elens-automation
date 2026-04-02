import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';

// 레이블이 필요하지 않은 input 타입
const SKIP_TYPES = ['hidden', 'submit', 'button', 'image', 'reset'];

/**
 * input-label 규칙
 * KWCAG 1.3.1: 정보와 관계
 *
 * <input> 요소에 접근 가능한 이름이 있어야 합니다
 * - label[for]로 연결되어 있거나
 * - aria-label / aria-labelledby가 있거나
 * - title 속성이 있어야 함
 *
 * 자동 수정:
 * - placeholder가 있으면 aria-label로 복사 (Grade A)
 * - title이 있으면 OK (스킵)
 * - 둘 다 없으면 수동 처리 (Grade B)
 */
export const inputLabelRule: RuleDefinition = {
  id: 'input-label',
  kwcag: '1.3.1',
  grade: 'A',
  description: '입력 요소에 레이블이 연결되어야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      $('input').each((index, element) => {
        const $input = $(element);
        const type = ($input.attr('type') || 'text').toLowerCase();

        // 레이블이 필요 없는 타입 스킵
        if (SKIP_TYPES.includes(type)) {
          return;
        }

        // 이미 접근 가능한 이름이 있는지 확인
        const hasAriaLabel = !!$input.attr('aria-label');
        const hasAriaLabelledby = !!$input.attr('aria-labelledby');
        const hasTitle = !!$input.attr('title');

        if (hasAriaLabel || hasAriaLabelledby || hasTitle) {
          return;
        }

        // label[for]로 연결되어 있는지 확인
        const id = $input.attr('id');
        if (id) {
          const hasLabel = $(`label[for="${id}"]`).length > 0;
          if (hasLabel) {
            return;
          }
        }

        // label 내부에 있는지 확인 (암묵적 연결)
        const isInsideLabel = $input.parents('label').length > 0;
        if (isInsideLabel) {
          return;
        }

        // 위반 발견
        const placeholder = $input.attr('placeholder');
        const name = $input.attr('name');

        let selector = 'input';
        if (id) {
          selector = `input#${id}`;
        } else if (name) {
          selector = `input[name="${name}"]`;
        } else {
          selector = `input:nth-of-type(${index + 1})`;
        }

        // placeholder가 있으면 Grade A (aria-label로 자동 수정 가능)
        // 없으면 Grade B (수동 처리 필요)
        const fixable = !!placeholder;
        const grade = fixable ? 'A' : 'B';

        violations.push({
          ruleId: 'input-label',
          grade,
          selector,
          fixable,
          original: $.html($input),
          suggestion: fixable
            ? undefined
            : '입력 필드에 레이블을 연결하거나 aria-label 속성을 추가해야 합니다',
          meta: { placeholder, index },
        });
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      if (!violation.fixable) {
        return false;
      }

      const $input = $(violation.selector);
      if ($input.length === 0) {
        return false;
      }

      // placeholder를 aria-label로 복사
      const placeholder = $input.attr('placeholder');
      if (placeholder) {
        $input.attr('aria-label', placeholder);
        return true;
      }

      return false;
    },
  },
};
