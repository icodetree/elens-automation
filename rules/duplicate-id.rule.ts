import type { RuleDefinition, CheerioAPI, ViolationInfo } from '@a11y-fixer/core';

/**
 * duplicate-id 규칙
 * KWCAG 4.1.1: 마크업 오류 방지
 *
 * 동일한 id가 여러 요소에 사용되면 안 됩니다
 *
 * 자동 수정:
 * - 첫 번째 요소는 원본 id 유지
 * - 두 번째 이후 요소는 id에 숫자 접미사 추가 (예: id="foo" → id="foo-2")
 */
export const duplicateIdRule: RuleDefinition = {
  id: 'duplicate-id',
  kwcag: '4.1.1',
  grade: 'A',
  description: '중복된 id 속성이 없어야 합니다',

  detect: {
    html: ($: CheerioAPI): ViolationInfo[] => {
      const violations: ViolationInfo[] = [];
      const idMap = new Map<string, number>();

      // 모든 id 수집하고 중복 카운트
      $('[id]').each((_, element) => {
        const id = $(element).attr('id');
        if (id) {
          idMap.set(id, (idMap.get(id) || 0) + 1);
        }
      });

      // 중복된 id만 필터링
      const duplicateIds = new Set<string>();
      for (const [id, count] of idMap) {
        if (count > 1) {
          duplicateIds.add(id);
        }
      }

      // 중복된 id를 가진 요소들에 대해 위반 생성 (첫 번째 제외)
      const seenCount = new Map<string, number>();

      $('[id]').each((_, element) => {
        const id = $(element).attr('id');
        if (!id || !duplicateIds.has(id)) {
          return;
        }

        const currentCount = (seenCount.get(id) || 0) + 1;
        seenCount.set(id, currentCount);

        // 첫 번째 요소는 스킵
        if (currentCount === 1) {
          return;
        }

        const suffix = currentCount;
        const newId = `${id}-${suffix}`;

        violations.push({
          ruleId: 'duplicate-id',
          grade: 'A',
          selector: `[id="${id}"]`,
          fixable: true,
          suggestion: `중복된 id="${id}"를 id="${newId}"로 변경합니다`,
          meta: {
            originalId: id,
            newId,
            occurrence: currentCount,
          },
        });
      });

      return violations;
    },
  },

  fix: {
    html: ($: CheerioAPI, violation: ViolationInfo): boolean => {
      const meta = violation.meta as {
        originalId: string;
        newId: string;
        occurrence: number;
      } | undefined;

      if (!meta) {
        return false;
      }

      const { originalId, newId, occurrence } = meta;

      // 해당 id를 가진 모든 요소를 찾아서 n번째 요소 수정
      let count = 0;
      let fixed = false;

      $('[id]').each((_, element) => {
        const $el = $(element);
        const id = $el.attr('id');

        if (id === originalId) {
          count++;
          if (count === occurrence) {
            $el.attr('id', newId);
            fixed = true;
            return false; // break
          }
        }
      });

      return fixed;
    },
  },
};
