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
 * JSX 어트리뷰트에서 string 값 추출
 */
function getJsxAttrValue(attr: t.JSXAttribute): string | null {
  if (t.isStringLiteral(attr.value)) {
    return attr.value.value;
  }
  if (
    t.isJSXExpressionContainer(attr.value) &&
    t.isStringLiteral(attr.value.expression)
  ) {
    return attr.value.expression.value;
  }
  return null;
}

/**
 * JSX opening element에서 특정 이름의 어트리뷰트 값 추출
 */
function getJsxPropValue(
  openingEl: t.JSXOpeningElement,
  propName: string
): string | null {
  for (const attr of openingEl.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: propName })) {
      return getJsxAttrValue(attr);
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
 * img-alt 규칙
 * KWCAG 1.1.1: 적절한 대체 텍스트 제공
 *
 * <img> 태그에 alt 속성이 없으면 alt="" 추가 (장식 이미지 처리)
 * - role="presentation" 또는 aria-hidden="true"가 있으면 스킵
 * - 파일명 기반 대체텍스트 생성하지 않음 (맥락 판단 불가)
 */
export const imgAltRule: RuleDefinition = {
  id: 'img-alt',
  kwcag: '1.1.1',
  grade: 'A',
  description: '이미지에 대체 텍스트(alt)가 제공되어야 합니다',

  detect: {
    jsx: (ast: unknown): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      let imgIndex = 0;

      traverse(ast as File, {
        JSXOpeningElement(path) {
          if (!t.isJSXIdentifier(path.node.name, { name: 'img' })) {
            return;
          }

          const openingEl = path.node;
          const currentIndex = imgIndex++;

          // role="presentation" 또는 aria-hidden="true"가 있으면 스킵
          const role = getJsxPropValue(openingEl, 'role');
          const ariaHidden = getJsxPropValue(openingEl, 'aria-hidden');
          if (role === 'presentation' || ariaHidden === 'true') {
            return;
          }

          // alt 속성이 없는 경우만 처리
          if (!hasJsxProp(openingEl, 'alt')) {
            const src = getJsxPropValue(openingEl, 'src') ?? '';
            const line = openingEl.loc?.start.line;

            // AST 노드에 인덱스 마킹 (fix에서 찾기 위해)
            (openingEl as unknown as { _a11yIndex?: number })._a11yIndex = currentIndex;

            violations.push({
              ruleId: 'img-alt',
              grade: 'A',
              selector: src ? `img[src="${src}"]` : `img:nth(${currentIndex})`,
              line,
              fixable: true,
              meta: { nodeIndex: currentIndex },
            });
          }
        },
      });

      return violations;
    },

    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      $('img').each((index, element) => {
        const $img = $(element);

        // role="presentation" 또는 aria-hidden="true"가 있으면 스킵
        const role = $img.attr('role');
        const ariaHidden = $img.attr('aria-hidden');

        if (role === 'presentation' || ariaHidden === 'true') {
          return;
        }

        // alt 속성이 없는 경우만 (빈 alt는 허용)
        const alt = $img.attr('alt');
        if (alt === undefined) {
          // 고유 선택자 생성
          const id = $img.attr('id');
          const src = $img.attr('src') || '';
          const className = $img.attr('class') || '';

          let selector = 'img';
          if (id) {
            selector = `img#${id}`;
          } else if (src) {
            selector = `img[src="${src}"]`;
          } else if (className) {
            selector = `img.${className.split(' ')[0]}`;
          } else {
            selector = `img:nth-of-type(${index + 1})`;
          }

          violations.push({
            ruleId: 'img-alt',
            grade: 'A',
            selector,
            fixable: true,
            original: $.html($img),
            meta: { index },
          });
        }
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const $img = $(violation.selector);

      if ($img.length === 0) {
        return false;
      }

      // alt 속성이 없으면 빈 alt 추가
      const alt = $img.attr('alt');
      if (alt === undefined) {
        $img.attr('alt', '');
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
          if (!t.isJSXIdentifier(path.node.name, { name: 'img' })) {
            return;
          }

          const openingEl = path.node;
          const nodeMeta = (openingEl as unknown as { _a11yIndex?: number })._a11yIndex;
          if (nodeMeta !== targetIndex) {
            return;
          }

          if (!hasJsxProp(openingEl, 'alt')) {
            openingEl.attributes.push(
              t.jsxAttribute(t.jsxIdentifier('alt'), t.stringLiteral(''))
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
