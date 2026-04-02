import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { File } from '@babel/types';

// @babel/traverse CJS interop
const traverse =
  typeof _traverse === 'function'
    ? _traverse
    : ((_traverse as unknown as { default: typeof _traverse }).default ?? _traverse);

/**
 * tabindex-positive 규칙
 * KWCAG 2.4.3: 포커스 순서
 *
 * tabindex 값이 1 이상인 양의 정수이면 tabindex="0"으로 변경
 * - tabindex="0": 정상 (스킵)
 * - tabindex="-1": 정상 (스킵)
 * - tabindex 없음: 정상 (스킵)
 */
export const tabindexPositiveRule: RuleDefinition = {
  id: 'tabindex-positive',
  kwcag: '2.4.3',
  grade: 'A',
  description: 'tabindex 값이 양의 정수(1 이상)이면 0으로 변경해야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      $('[tabindex]').each((index, element) => {
        const $el = $(element);
        const tabindexVal = $el.attr('tabindex') ?? '';
        const num = parseInt(tabindexVal, 10);

        // 양의 정수(1 이상)인 경우만 위반
        if (!isNaN(num) && num >= 1) {
          const id = $el.attr('id');
          const tagName = element.tagName.toLowerCase();
          const className = $el.attr('class') || '';

          let selector: string;
          if (id) {
            selector = `${tagName}#${id}`;
          } else if (className) {
            selector = `${tagName}.${className.split(' ')[0]}`;
          } else {
            selector = `[tabindex="${tabindexVal}"]:nth-of-type(${index + 1})`;
          }

          violations.push({
            ruleId: 'tabindex-positive',
            grade: 'A',
            selector,
            fixable: true,
            original: $.html($el),
            meta: { tabindexVal, index },
          });
        }
      });

      return violations;
    },

    jsx: (ast: unknown): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      let elIndex = 0;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          const openingEl = path.node;
          const currentIndex = elIndex++;

          // tabIndex prop 찾기
          for (const attr of openingEl.attributes) {
            if (!t.isJSXAttribute(attr)) continue;
            if (!t.isJSXIdentifier(attr.name, { name: 'tabIndex' })) continue;

            let numVal: number | null = null;

            if (t.isStringLiteral(attr.value)) {
              numVal = parseInt(attr.value.value, 10);
            } else if (
              t.isJSXExpressionContainer(attr.value) &&
              t.isNumericLiteral(attr.value.expression)
            ) {
              numVal = attr.value.expression.value;
            } else if (
              t.isJSXExpressionContainer(attr.value) &&
              t.isStringLiteral(attr.value.expression)
            ) {
              numVal = parseInt(attr.value.expression.value, 10);
            }

            if (numVal !== null && !isNaN(numVal) && numVal >= 1) {
              const line = openingEl.loc?.start.line;
              const tagName = t.isJSXIdentifier(openingEl.name)
                ? openingEl.name.name
                : 'element';

              // AST 노드에 인덱스 마킹
              (openingEl as unknown as { _a11yIndex?: number })._a11yIndex = currentIndex;

              violations.push({
                ruleId: 'tabindex-positive',
                grade: 'A',
                selector: `${tagName}:nth(${currentIndex})`,
                line,
                fixable: true,
                meta: { nodeIndex: currentIndex },
              });
            }

            break;
          }
        },
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const meta = violation.meta as { tabindexVal?: string; index?: number };

      // CSS selector는 nth-of-type 등으로 부정확할 수 있으므로
      // detect에서 저장한 index로 정확히 찾음
      const $el = meta?.index !== undefined
        ? $('[tabindex]').eq(meta.index)
        : $(violation.selector);

      if ($el.length === 0) {
        return false;
      }

      const tabindexVal = $el.attr('tabindex') ?? '';
      const num = parseInt(tabindexVal, 10);

      if (!isNaN(num) && num >= 1) {
        $el.attr('tabindex', '0');
        return true;
      }

      return false;
    },

    jsx: (ast: unknown, violation: ViolationInfo): boolean => {
      const meta = violation.meta as { nodeIndex?: number } | undefined;
      const targetIndex = meta?.nodeIndex ?? -1;
      let fixed = false;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          const openingEl = path.node;
          const nodeMeta = (openingEl as unknown as { _a11yIndex?: number })._a11yIndex;

          if (nodeMeta !== targetIndex) {
            return;
          }

          for (const attr of openingEl.attributes) {
            if (!t.isJSXAttribute(attr)) continue;
            if (!t.isJSXIdentifier(attr.name, { name: 'tabIndex' })) continue;

            // 항상 숫자 리터럴 0으로 교체
            attr.value = t.jsxExpressionContainer(t.numericLiteral(0));
            fixed = true;
            break;
          }

          path.stop();
        },
      });

      return fixed;
    },
  },
};
