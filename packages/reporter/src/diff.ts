import { createTwoFilesPatch } from 'diff';

/**
 * unified diff 생성
 */
export function generateDiff(
  filePath: string,
  original: string,
  modified: string
): string {
  return createTwoFilesPatch(filePath, filePath, original, modified, 'original', 'fixed');
}
