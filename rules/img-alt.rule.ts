import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';

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
  },
};
