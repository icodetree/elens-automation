import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';

/**
 * html-lang 규칙
 * KWCAG 4.1.2: 마크업 오류 방지
 *
 * <html> 태그에 lang 속성이 없으면 lang="ko" 추가
 */
export const htmlLangRule: RuleDefinition = {
  id: 'html-lang',
  kwcag: '4.1.2',
  grade: 'A',
  description: 'HTML 문서에 언어 속성(lang)이 지정되어야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      const html = $('html');

      if (html.length === 0) {
        return violations;
      }

      const lang = html.attr('lang');

      if (!lang || lang.trim() === '') {
        violations.push({
          ruleId: 'html-lang',
          grade: 'A',
          selector: 'html',
          fixable: true,
          original: $.html(html).split('\n')[0],
        });
      }

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const html = $(violation.selector);

      if (html.length === 0) {
        return false;
      }

      // lang 속성이 없거나 비어있으면 ko로 설정
      const currentLang = html.attr('lang');
      if (!currentLang || currentLang.trim() === '') {
        html.attr('lang', 'ko');
        return true;
      }

      return false;
    },
  },
};
