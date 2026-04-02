import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';

/**
 * table-scope 규칙
 * KWCAG 1.3.1: 정보와 관계
 *
 * <table> 안에 <th> 엘리먼트가 있는데 scope 속성이 없는 경우
 * - <thead> 안의 <th> → scope="col" 추가
 * - <tbody> 또는 <tr> 안에서 행의 첫 번째 셀인 <th> → scope="row" 추가
 * - 그 외 → scope="col" 추가 (기본값)
 *
 * HTML only (JSX 불필요 - PRD 명세)
 */
export const tableScopeRule: RuleDefinition = {
  id: 'table-scope',
  kwcag: '1.3.1',
  grade: 'A',
  description: '표 헤더(<th>)에는 scope 속성이 있어야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];

      $('table').each((_tableIndex, table) => {
        $(table).find('th').each((thIndex, th) => {
          const $th = $(th);

          // scope가 이미 있으면 스킵
          if ($th.attr('scope') !== undefined) {
            return;
          }

          // 위치 판단: thead 안에 있는지 확인
          const inThead = $th.closest('thead').length > 0;

          // tbody/tr 안에서 행의 첫 번째 셀인지 확인
          let isFirstInRow = false;
          if (!inThead) {
            const $tr = $th.closest('tr');
            const firstCell = $tr.find('th, td').first();
            isFirstInRow = firstCell.is($th);
          }

          const scopeValue = inThead ? 'col' : (isFirstInRow ? 'row' : 'col');

          // 고유 선택자 생성
          const id = $th.attr('id');
          let selector: string;

          if (id) {
            selector = `th#${id}`;
          } else {
            // 테이블 내에서의 위치로 선택자 생성
            const $tr = $th.closest('tr');
            const cellIndex = $tr.find('th, td').index($th);
            const trIndex = $(table).find('tr').index($tr);
            selector = `table th[data-a11y-th-index="${trIndex}-${cellIndex}"]`;

            // 임시 data 속성으로 마킹
            $th.attr('data-a11y-th-index', `${trIndex}-${cellIndex}`);
          }

          violations.push({
            ruleId: 'table-scope',
            grade: 'A',
            selector,
            fixable: true,
            original: $.html($th),
            meta: { scopeValue, thIndex },
          });
        });
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const meta = violation.meta as { scopeValue?: string } | undefined;
      const scopeValue = meta?.scopeValue ?? 'col';

      const $th = $(violation.selector);

      if ($th.length === 0) {
        return false;
      }

      if ($th.attr('scope') === undefined) {
        $th.attr('scope', scopeValue);
        // 임시 마킹 속성 제거
        $th.removeAttr('data-a11y-th-index');
        return true;
      }

      // 임시 마킹 속성만 정리
      $th.removeAttr('data-a11y-th-index');
      return false;
    },
  },
};
