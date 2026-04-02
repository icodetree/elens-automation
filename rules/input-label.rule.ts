import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { File } from '@babel/types';

// @babel/traverse CJS interop
const traverse =
  typeof _traverse === 'function'
    ? _traverse
    : ((_traverse as unknown as { default: typeof _traverse }).default ?? _traverse);

// 레이블이 필요하지 않은 input 타입
const SKIP_TYPES = ['hidden', 'submit', 'button', 'image', 'reset'];

/**
 * JSX opening element에서 특정 이름의 어트리뷰트 문자열 값 추출
 */
function getJsxPropValue(
  openingEl: t.JSXOpeningElement,
  propName: string
): string | null {
  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: propName })) {
      if (t.isStringLiteral(attr.value)) {
        return attr.value.value;
      }
      if (
        t.isJSXExpressionContainer(attr.value) &&
        t.isStringLiteral(attr.value.expression)
      ) {
        return attr.value.expression.value;
      }
      // 속성은 존재하지만 값이 문자열이 아닌 경우 빈 문자열 반환
      return '';
    }
  }
  return null;
}

/**
 * JSX opening element에 특정 prop이 존재하는지 확인
 */
function hasJsxProp(openingEl: t.JSXOpeningElement, propName: string): boolean {
  return openingEl.attributes.some(
    (attr) =>
      t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: propName })
  );
}

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
    jsx: (ast: unknown): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      let inputIndex = 0;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          if (!t.isJSXIdentifier(path.node.name, { name: 'input' })) {
            return;
          }

          const openingEl = path.node;
          const currentIndex = inputIndex++;

          // type 속성 확인
          const type = (getJsxPropValue(openingEl, 'type') ?? 'text').toLowerCase();
          if (SKIP_TYPES.includes(type)) {
            return;
          }

          // 이미 접근 가능한 이름이 있는지 확인
          if (
            hasJsxProp(openingEl, 'aria-label') ||
            hasJsxProp(openingEl, 'aria-labelledby') ||
            hasJsxProp(openingEl, 'title')
          ) {
            return;
          }

          // JSX에서는 htmlFor를 사용해 label 연결을 확인하기 어려우므로 스킵하지 않음
          // (런타임 의존적 판단이므로 Grade A 범위에서 처리)

          const placeholder = getJsxPropValue(openingEl, 'placeholder');
          const line = openingEl.loc?.start.line;

          // AST 노드에 인덱스 마킹
          (openingEl as unknown as { _a11yIndex?: number })._a11yIndex = currentIndex;

          const fixable = !!placeholder;
          const grade = fixable ? 'A' : 'B';

          violations.push({
            ruleId: 'input-label',
            grade,
            selector: `input:nth(${currentIndex})`,
            line,
            fixable,
            suggestion: fixable
              ? undefined
              : '입력 필드에 레이블을 연결하거나 aria-label 속성을 추가해야 합니다',
            meta: { nodeIndex: currentIndex, placeholder },
          });
        },
      });

      return violations;
    },

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

    jsx: (ast: unknown, violation: ViolationInfo): boolean => {
      if (!violation.fixable) {
        return false;
      }

      const meta = violation.meta as { nodeIndex?: number; placeholder?: string } | undefined;
      const targetIndex = meta?.nodeIndex ?? -1;
      const placeholder = meta?.placeholder;

      if (!placeholder) {
        return false;
      }

      let fixed = false;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          if (!t.isJSXIdentifier(path.node.name, { name: 'input' })) {
            return;
          }

          const openingEl = path.node;
          const nodeMeta = (openingEl as unknown as { _a11yIndex?: number })._a11yIndex;
          if (nodeMeta !== targetIndex) {
            return;
          }

          if (!hasJsxProp(openingEl, 'aria-label')) {
            openingEl.attributes.push(
              t.jsxAttribute(t.jsxIdentifier('aria-label'), t.stringLiteral(placeholder))
            );
            fixed = true;
          }

          path.stop();
        },
      });

      return fixed;
    },
  },
};
