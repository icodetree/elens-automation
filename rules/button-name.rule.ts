import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';

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
  },
};
