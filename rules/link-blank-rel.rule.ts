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
 * link-blank-rel 규칙
 * 보안: target="_blank" 보안 취약점
 *
 * <a target="_blank"> 엘리먼트 중 rel 속성에 noopener가 없는 것을 탐지
 * - rel 없음 → rel="noopener noreferrer" 추가
 * - rel 있지만 noopener 없음 → 기존 값에 noopener noreferrer 추가
 */
export const linkBlankRelRule: RuleDefinition = {
  id: 'link-blank-rel',
  kwcag: 'security',
  grade: 'A',
  description: 'target="_blank" 링크에는 rel="noopener noreferrer"가 있어야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      $('a[target="_blank"]').each((index, element) => {
        const $a = $(element);
        const rel = $a.attr('rel') ?? '';
        const relParts = rel.split(/\s+/).filter(Boolean);

        if (!relParts.includes('noopener')) {
          const id = $a.attr('id');
          const href = $a.attr('href') ?? '';
          const className = $a.attr('class') ?? '';

          let selector: string;
          if (id) {
            selector = `a#${id}`;
          } else if (href) {
            selector = `a[href="${href}"]`;
          } else if (className) {
            selector = `a.${className.split(' ')[0]}`;
          } else {
            selector = `a[target="_blank"]:nth-of-type(${index + 1})`;
          }

          violations.push({
            ruleId: 'link-blank-rel',
            grade: 'A',
            selector,
            fixable: true,
            original: $.html($a),
            meta: { existingRel: rel, index },
          });
        }
      });

      return violations;
    },

    jsx: (ast: unknown): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      let linkIndex = 0;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          const openingEl = path.node;

          if (!t.isJSXIdentifier(openingEl.name, { name: 'a' })) {
            return;
          }

          const currentIndex = linkIndex++;

          // target="_blank" 확인
          let hasBlankTarget = false;
          let relValue: string | null = null;

          for (const attr of openingEl.attributes) {
            if (!t.isJSXAttribute(attr)) continue;

            if (t.isJSXIdentifier(attr.name, { name: 'target' })) {
              if (t.isStringLiteral(attr.value) && attr.value.value === '_blank') {
                hasBlankTarget = true;
              }
            }

            if (t.isJSXIdentifier(attr.name, { name: 'rel' })) {
              if (t.isStringLiteral(attr.value)) {
                relValue = attr.value.value;
              } else if (
                t.isJSXExpressionContainer(attr.value) &&
                t.isStringLiteral(attr.value.expression)
              ) {
                relValue = attr.value.expression.value;
              }
            }
          }

          if (!hasBlankTarget) {
            return;
          }

          const relParts = (relValue ?? '').split(/\s+/).filter(Boolean);
          if (!relParts.includes('noopener')) {
            const line = openingEl.loc?.start.line;

            // AST 노드에 인덱스 마킹
            (openingEl as unknown as { _a11yIndex?: number })._a11yIndex = currentIndex;

            violations.push({
              ruleId: 'link-blank-rel',
              grade: 'A',
              selector: `a:nth(${currentIndex})`,
              line,
              fixable: true,
              meta: { nodeIndex: currentIndex, existingRel: relValue },
            });
          }
        },
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const meta = violation.meta as { existingRel?: string; index?: number };

      // href-based selector는 동일 href의 다른 요소도 매칭할 수 있으므로
      // detect에서 저장한 index로 target="_blank" 요소 중 정확히 찾음
      const $a = meta?.index !== undefined
        ? $('a[target="_blank"]').eq(meta.index)
        : $(violation.selector);

      if ($a.length === 0) {
        return false;
      }

      const rel = $a.attr('rel') ?? '';
      const relParts = rel.split(/\s+/).filter(Boolean);

      if (!relParts.includes('noopener')) {
        const newRel = relParts.length > 0
          ? [...relParts, 'noopener', 'noreferrer'].join(' ')
          : 'noopener noreferrer';
        $a.attr('rel', newRel);
        return true;
      }

      return false;
    },

    jsx: (ast: unknown, violation: ViolationInfo): boolean => {
      const meta = violation.meta as { nodeIndex?: number; existingRel?: string | null } | undefined;
      const targetIndex = meta?.nodeIndex ?? -1;
      let fixed = false;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          const openingEl = path.node;

          if (!t.isJSXIdentifier(openingEl.name, { name: 'a' })) {
            return;
          }

          const nodeMeta = (openingEl as unknown as { _a11yIndex?: number })._a11yIndex;
          if (nodeMeta !== targetIndex) {
            return;
          }

          const existingRel = meta?.existingRel ?? null;
          const relParts = (existingRel ?? '').split(/\s+/).filter(Boolean);

          if (!relParts.includes('noopener')) {
            const newRelValue = relParts.length > 0
              ? [...relParts, 'noopener', 'noreferrer'].join(' ')
              : 'noopener noreferrer';

            // 기존 rel 어트리뷰트 교체 또는 새로 추가
            const existingRelAttr = openingEl.attributes.find(
              (attr) =>
                t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'rel' })
            );

            if (existingRelAttr && t.isJSXAttribute(existingRelAttr)) {
              existingRelAttr.value = t.stringLiteral(newRelValue);
            } else {
              openingEl.attributes.push(
                t.jsxAttribute(t.jsxIdentifier('rel'), t.stringLiteral(newRelValue))
              );
            }

            fixed = true;
          }

          path.stop();
        },
      });

      return fixed;
    },
  },
};
