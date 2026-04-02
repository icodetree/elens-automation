import { readFile } from 'node:fs/promises';
import type { Violation } from '@a11y-fixer/core';

/**
 * 이렌즈 JSON 파일을 읽어 Violation[] 로 반환
 *
 * 이렌즈 JSON 포맷은 Violation[] 타입과 동일한 스키마를 따름.
 * 파일이 없거나 파싱 실패 시 빈 배열 반환.
 */
export async function loadElensViolations(filePath: string): Promise<Violation[]> {
  const raw = await readFile(filePath, 'utf-8');
  const data: unknown = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`이렌즈 JSON 형식 오류: 최상위가 배열이어야 합니다 (${filePath})`);
  }

  // 스키마 검증: 필수 필드 확인
  const violations: Violation[] = [];
  for (const item of data) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).ruleId === 'string' &&
      typeof (item as Record<string, unknown>).grade === 'string' &&
      typeof (item as Record<string, unknown>).file === 'string' &&
      typeof (item as Record<string, unknown>).selector === 'string' &&
      typeof (item as Record<string, unknown>).fixable === 'boolean'
    ) {
      violations.push(item as Violation);
    }
  }

  return violations;
}

/**
 * 이렌즈 위반 목록을 파일 경로별로 그룹화
 */
export function groupByFile(violations: Violation[]): Map<string, Violation[]> {
  const map = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = map.get(v.file) ?? [];
    list.push(v);
    map.set(v.file, list);
  }
  return map;
}

/**
 * 이렌즈 위반 목록을 기반으로 파일 처리 우선순위를 정렬
 * 이렌즈에서 많은 위반이 발견된 파일을 먼저 처리
 */
export function prioritizeFiles(files: string[], elensViolations: Violation[]): string[] {
  const countByFile = new Map<string, number>();
  for (const v of elensViolations) {
    countByFile.set(v.file, (countByFile.get(v.file) ?? 0) + 1);
  }

  return [...files].sort((a, b) => {
    const countA = countByFile.get(a) ?? 0;
    const countB = countByFile.get(b) ?? 0;
    return countB - countA; // 위반 많은 파일 먼저
  });
}
