import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { File } from '@babel/types';

// @babel/traverse CJS interop
const traverse =
  typeof _traverse === 'function'
    ? _traverse
    : ((_traverse as unknown as { default: typeof _traverse }).default ?? _traverse);

const INTERACTIVE_TAGS = ['div', 'span'];

/**
 * div-onclick-role 규칙
 * KWCAG 4.1.2: 이름, 역할, 값
 *
 * onclick(onClick) 속성이 있는 <div> 또는 <span> 엘리먼트에 role이 없으면
 * role="button" + tabindex="0" 추가
 */
export const divOnclickRoleRule: RuleDefinition = {
  id: 'div-onclick-role',
  kwcag: '4.1.2',
  grade: 'A',
  description: 'onclick이 있는 div/span에는 role="button"과 tabindex="0"이 있어야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      INTERACTIVE_TAGS.forEach((tag) => {
        $(`${tag}[onclick]`).each((index, element) => {
          const $el = $(element);
          const role = $el.attr('role');

          if (!role) {
            const id = $el.attr('id');
            const className = $el.attr('class') ?? '';

            let selector: string;
            if (id) {
              selector = `${tag}#${id}`;
            } else if (className) {
              selector = `${tag}.${className.split(' ')[0]}`;
            } else {
              selector = `${tag}[onclick]:nth-of-type(${index + 1})`;
            }

            const hasTabindex = $el.attr('tabindex') !== undefined;

            violations.push({
              ruleId: 'div-onclick-role',
              grade: 'A',
              selector,
              fixable: true,
              original: $.html($el),
              meta: { tag, hasTabindex, index },
            });
          }
        });
      });

      return violations;
    },

    jsx: (ast: unknown): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      let elIndex = 0;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          const openingEl = path.node;

          if (!t.isJSXIdentifier(openingEl.name)) {
            return;
          }

          const tagName = openingEl.name.name;
          if (!INTERACTIVE_TAGS.includes(tagName)) {
            return;
          }

          const currentIndex = elIndex++;

          let hasOnClick = false;
          let hasRole = false;
          let hasTabIndex = false;

          for (const attr of openingEl.attributes) {
            if (!t.isJSXAttribute(attr)) continue;
            if (t.isJSXIdentifier(attr.name, { name: 'onClick' })) hasOnClick = true;
            if (t.isJSXIdentifier(attr.name, { name: 'role' })) hasRole = true;
            if (t.isJSXIdentifier(attr.name, { name: 'tabIndex' })) hasTabIndex = true;
          }

          if (hasOnClick && !hasRole) {
            const line = openingEl.loc?.start.line;

            // AST 노드에 인덱스 마킹
            (openingEl as unknown as { _a11yIndex?: number })._a11yIndex = currentIndex;

            violations.push({
              ruleId: 'div-onclick-role',
              grade: 'A',
              selector: `${tagName}:nth(${currentIndex})`,
              line,
              fixable: true,
              meta: { nodeIndex: currentIndex, tag: tagName, hasTabIndex },
            });
          }
        },
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const $el = $(violation.selector);

      if ($el.length === 0) {
        return false;
      }

      let changed = false;

      if (!$el.attr('role')) {
        $el.attr('role', 'button');
        changed = true;
      }

      if (!$el.attr('tabindex')) {
        $el.attr('tabindex', '0');
        changed = true;
      }

      return changed;
    },

    jsx: (ast: unknown, violation: ViolationInfo): boolean => {
      const meta = violation.meta as {
        nodeIndex?: number;
        hasTabIndex?: boolean;
      } | undefined;
      const targetIndex = meta?.nodeIndex ?? -1;
      let fixed = false;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          const openingEl = path.node;
          const nodeMeta = (openingEl as unknown as { _a11yIndex?: number })._a11yIndex;

          if (nodeMeta !== targetIndex) {
            return;
          }

          // role="button" 추가
          const hasRole = openingEl.attributes.some(
            (attr) =>
              t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'role' })
          );

          if (!hasRole) {
            openingEl.attributes.push(
              t.jsxAttribute(t.jsxIdentifier('role'), t.stringLiteral('button'))
            );
            fixed = true;
          }

          // tabIndex={0} 추가 (없는 경우)
          const hasTabIndex = openingEl.attributes.some(
            (attr) =>
              t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'tabIndex' })
          );

          if (!hasTabIndex) {
            openingEl.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('tabIndex'),
                t.jsxExpressionContainer(t.numericLiteral(0))
              )
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
