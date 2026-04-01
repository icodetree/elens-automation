import type { Violation } from '@a11y-fixer/core';
import { writeFile } from 'node:fs/promises';

/**
 * manual-queue.json 생성
 * Grade B/C 위반 항목을 JSON으로 직렬화
 */
export async function writeManualQueue(
  violations: Violation[],
  outputPath: string
): Promise<void> {
  const manualItems = violations.filter((v) => v.grade !== 'A' || !v.fixable);
  await writeFile(outputPath, JSON.stringify(manualItems, null, 2), 'utf-8');
}

/**
 * manual-queue.json 스키마 검증
 */
export function validateQueueSchema(data: unknown): data is Violation[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'ruleId' in item &&
      'grade' in item &&
      'file' in item &&
      'selector' in item &&
      'fixable' in item
  );
}
