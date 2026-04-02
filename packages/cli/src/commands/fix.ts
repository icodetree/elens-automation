import { Command } from 'commander';
import { glob } from 'glob';
import { resolve, relative, dirname, basename } from 'node:path';
import { stat, mkdir, writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import type { Env, Grade, FixResult } from '@a11y-fixer/core';
import { fixFile, getSupportedExtensions } from '@a11y-fixer/core';
import { rules } from '@a11y-fixer/rules';
import { writeManualQueue, printSummary, printScanResult } from '@a11y-fixer/reporter';

function parseGrade(value: string): Grade[] {
  return value.split(',').map((g) => g.trim().toUpperCase()) as Grade[];
}

export const fixCommand = new Command('fix')
  .description('오류 자동 수정 및 결과 출력')
  .argument('<path>', '수정할 경로')
  .option('--env <type>', '환경 타입 (html | jsx | tsx | auto)', 'auto')
  .option('--dry-run', '파일 수정 없이 변경사항 미리보기', false)
  .option('--out <dir>', '수정 파일 출력 경로', './fixed')
  .option('--from-elens <file>', '이렌즈 JSON으로 우선순위 보정')
  .option('--grade <grades>', '처리할 Grade 범위 (A 또는 A,B)', parseGrade, ['A'] as Grade[])
  .option('--page <file>', '특정 파일만 처리')
  .action(
    async (
      inputPath: string,
      options: {
        env: Env | 'auto';
        dryRun: boolean;
        out: string;
        fromElens?: string;
        grade: Grade[];
        page?: string;
      }
    ) => {
      const targetPath = resolve(inputPath);
      const outDir = resolve(options.out);

      // 파일 목록 수집
      const files = await collectFiles(targetPath, options.env, options.page);

      if (files.length === 0) {
        console.log('수정할 파일이 없습니다.');
        return;
      }

      console.log(`\n${files.length}개 파일 처리 중...`);
      if (options.dryRun) {
        console.log(chalk.yellow('(dry-run 모드: 실제 파일 수정 없음)\n'));
      }

      const results: FixResult[] = [];
      const manualQueue: FixResult['violations'] = [];

      for (const file of files) {
        const result = await fixFile(file, { grades: options.grade, rules });
        results.push(result);

        // 수동 처리 필요 항목 수집
        const manualItems = result.violations.filter(
          (v) => !v.fixable || !options.grade.includes(v.grade)
        );
        manualQueue.push(...manualItems);

        // 결과 출력
        if (result.violations.length > 0) {
          if (options.dryRun) {
            printScanResult(file, result.violations);
            if (result.diff) {
              console.log(chalk.dim('\n--- Diff ---'));
              console.log(result.diff);
            }
          } else if (result.fixedContent) {
            // 수정된 파일 저장
            const relativePath = relative(targetPath, file);
            const outputPath = resolve(outDir, relativePath);

            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, result.fixedContent, 'utf-8');

            console.log(
              chalk.green(`✓ ${relativePath}`) +
                chalk.dim(` (${result.fixedCount}개 수정)`)
            );
          }
        }
      }

      // manual-queue.json 저장
      if (!options.dryRun && manualQueue.length > 0) {
        const queuePath = resolve(outDir, 'manual-queue.json');
        await mkdir(outDir, { recursive: true });
        await writeManualQueue(manualQueue, queuePath);
        console.log(chalk.yellow(`\n⚠ manual-queue.json 생성: ${queuePath}`));
      }

      // 요약 출력
      printSummary(results);

      if (!options.dryRun && results.some((r) => r.fixedCount > 0)) {
        console.log(chalk.dim(`\n수정된 파일 위치: ${outDir}`));
      }
    }
  );

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
