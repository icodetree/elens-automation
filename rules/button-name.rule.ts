import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { File, JSXElement } from '@babel/types';

// @babel/traverse CJS interop
const traverse =
  typeof _traverse === 'function'
    ? _traverse
    : ((_traverse as unknown as { default: typeof _traverse }).default ?? _traverse);

/**
 * JSX opening element에서 특정 prop의 문자열 값 추출
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
 * JSXElement children에서 텍스트 노드가 있는지 확인 (공백 제외)
 */
function hasTextChildren(element: JSXElement): boolean {
  for (const child of element.children) {
    if (t.isJSXText(child) && child.value.trim()) {
      return true;
    }
    if (
      t.isJSXExpressionContainer(child) &&
      t.isStringLiteral(child.expression) &&
      child.expression.value.trim()
    ) {
      return true;
    }
  }
  return false;
}

/**
 * JSXElement children에서 img 태그의 alt 값 탐색
 */
function findImgAltInChildren(element: JSXElement): string | null {
  for (const child of element.children) {
    if (t.isJSXElement(child)) {
      const childOpening = child.openingElement;
      if (t.isJSXIdentifier(childOpening.name, { name: 'img' })) {
        const alt = getJsxPropValue(childOpening, 'alt');
        if (alt !== null && alt !== '') {
          return alt;
        }
      }
    }
  }
  return null;
}

/**
 * button-name 규칙
 * KWCAG 4.1.2: 마크업 오류 방지
 *
 * <button> 요소에 접근 가능한 이름이 있어야 합니다
 * - 텍스트 내용이 있거나
 * - aria-label / aria-labelledby가 있거나
 * - title 속성이 있어야 함
 *
 * 자동 수정:
 * - 내부 img에 alt가 있으면 aria-label로 복사 (Grade A)
 * - title이 있으면 aria-label로 복사 (Grade A)
 * - 둘 다 없으면 수동 처리 (Grade B)
 */
export const buttonNameRule: RuleDefinition = {
  id: 'button-name',
  kwcag: '4.1.2',
  grade: 'A',
  description: '버튼에 접근 가능한 이름이 있어야 합니다',

  detect: {
    jsx: (ast: unknown): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      let buttonIndex = 0;

      traverse(ast as File, {
        JSXElement(path) {
          const openingEl = path.node.openingElement;

          if (!t.isJSXIdentifier(openingEl.name, { name: 'button' })) {
            return;
          }

          const currentIndex = buttonIndex++;

          // 이미 접근 가능한 이름이 있는지 확인
          if (
            hasJsxProp(openingEl, 'aria-label') ||
            hasJsxProp(openingEl, 'aria-labelledby') ||
            hasJsxProp(openingEl, 'title')
          ) {
            return;
          }

          // 텍스트 자식 확인
          if (hasTextChildren(path.node)) {
            return;
          }

          const imgAlt = findImgAltInChildren(path.node);
          const line = openingEl.loc?.start.line;

          // AST 노드에 인덱스 마킹
          (openingEl as unknown as { _a11yIndex?: number })._a11yIndex = currentIndex;

          const fixable = imgAlt !== null;
          const grade = fixable ? 'A' : 'B';

          violations.push({
            ruleId: 'button-name',
            grade,
            selector: `button:nth(${currentIndex})`,
            line,
            fixable,
            suggestion: fixable
              ? undefined
              : '버튼에 텍스트를 추가하거나 aria-label 속성을 추가해야 합니다',
            meta: { nodeIndex: currentIndex, imgAlt },
          });
        },
      });

      return violations;
    },

    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      $('button').each((index, element) => {
        const $button = $(element);

        // 이미 접근 가능한 이름이 있는지 확인
        const hasAriaLabel = !!$button.attr('aria-label');
        const hasAriaLabelledby = !!$button.attr('aria-labelledby');

        if (hasAriaLabel || hasAriaLabelledby) {
          return;
        }

        // 텍스트 내용 확인 (공백 제거 후)
        const textContent = $button.text().trim();
        if (textContent) {
          return;
        }

        // title 확인
        const title = $button.attr('title');
        if (title) {
          return;
        }

        // 내부 img의 alt 확인
        const $innerImg = $button.find('img[alt]');
        const imgAlt = $innerImg.attr('alt');

        // 위반 발견
        const id = $button.attr('id');
        const className = $button.attr('class');

        let selector = 'button';
        if (id) {
          selector = `button#${id}`;
        } else if (className) {
          selector = `button.${className.split(' ')[0]}`;
        } else {
          selector = `button:nth-of-type(${index + 1})`;
        }

        // img alt가 있으면 Grade A (aria-label로 자동 수정 가능)
        // 없으면 Grade B (수동 처리 필요)
        const fixable = !!imgAlt;
        const grade = fixable ? 'A' : 'B';

        violations.push({
          ruleId: 'button-name',
          grade,
          selector,
          fixable,
          original: $.html($button),
          suggestion: fixable
            ? undefined
            : '버튼에 텍스트를 추가하거나 aria-label 속성을 추가해야 합니다',
          meta: { imgAlt, index },
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

      const $button = $(violation.selector);
      if ($button.length === 0) {
        return false;
      }

      // 내부 img의 alt를 aria-label로 복사
      const meta = violation.meta as { imgAlt?: string } | undefined;
      if (meta?.imgAlt) {
        $button.attr('aria-label', meta.imgAlt);
        return true;
      }

      return false;
    },

    jsx: (ast: unknown, violation: ViolationInfo): boolean => {
      if (!violation.fixable) {
        return false;
      }

      const meta = violation.meta as { nodeIndex?: number; imgAlt?: string | null } | undefined;
      const targetIndex = meta?.nodeIndex ?? -1;
      const imgAlt = meta?.imgAlt;

      if (!imgAlt) {
        return false;
      }

      let fixed = false;

      traverse(ast as File, {
        JSXElement(path) {
          const openingEl = path.node.openingElement;

          if (!t.isJSXIdentifier(openingEl.name, { name: 'button' })) {
            return;
          }

          const nodeMeta = (openingEl as unknown as { _a11yIndex?: number })._a11yIndex;
          if (nodeMeta !== targetIndex) {
            return;
          }

          if (!hasJsxProp(openingEl, 'aria-label')) {
            openingEl.attributes.push(
              t.jsxAttribute(t.jsxIdentifier('aria-label'), t.stringLiteral(imgAlt))
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
