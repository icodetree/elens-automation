import { Command } from 'commander';
import { glob } from 'glob';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import type { Env, Grade } from '@a11y-fixer/core';
import { scanFile, getSupportedExtensions } from '@a11y-fixer/core';
import { rules } from '@a11y-fixer/rules';
import { printScanResult } from '@a11y-fixer/reporter';

export const scanCommand = new Command('scan')
  .description('소스 파일 분석 (수정 없음, 오류 목록 출력)')
  .argument('<path>', '분석할 경로')
  .option('--env <type>', '환경 타입 (html | jsx | tsx | auto)', 'auto')
  .option('--page <file>', '특정 파일만 처리')
  .action(async (inputPath: string, options: { env: Env | 'auto'; page?: string }) => {
    const targetPath = resolve(inputPath);

    // 파일 목록 수집
    const files = await collectFiles(targetPath, options.env, options.page);

    if (files.length === 0) {
      console.log('분석할 파일이 없습니다.');
      return;
    }

    console.log(`\n${files.length}개 파일 분석 중...\n`);

    const grades: Grade[] = ['A', 'B', 'C'];
    let totalViolations = 0;

    for (const file of files) {
      const result = await scanFile(file, { grades, rules });
      if (result.violations.length > 0) {
        printScanResult(file, result.violations);
        totalViolations += result.violations.length;
      }
    }

    if (totalViolations === 0) {
      console.log('\n✓ 접근성 위반 항목이 없습니다.');
    } else {
      console.log(`\n총 ${totalViolations}개 위반 항목 발견`);
    }
  });

async function collectFiles(
  targetPath: string,
  env: Env | 'auto',
  page?: string
): Promise<string[]> {
  if (page) {
    return [resolve(targetPath, page)];
  }

  const stats = await stat(targetPath);

  if (stats.isFile()) {
    return [targetPath];
  }

  // 디렉토리인 경우 glob으로 파일 수집
  const extensions = env === 'auto' ? getSupportedExtensions() : [`.${env}`];
  const patterns = extensions.map((ext) => `**/*${ext}`);

  const files = await glob(patterns, {
    cwd: targetPath,
    absolute: true,
    nodir: true,
  });

  return files;
}
