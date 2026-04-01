import { Command } from 'commander';
import type { Env, Grade } from '@a11y-fixer/core';

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
  .option('--grade <grades>', '처리할 Grade 범위 (A 또는 A,B)', parseGrade, ['A'])
  .option('--page <file>', '특정 파일만 처리')
  .action(
    async (
      path: string,
      options: {
        env: Env | 'auto';
        dryRun: boolean;
        out: string;
        fromElens?: string;
        grade: Grade[];
        page?: string;
      }
    ) => {
      console.log(`[FIX] ${path}`);
      console.log(`  환경: ${options.env}`);
      console.log(`  Dry-run: ${options.dryRun}`);
      console.log(`  출력: ${options.out}`);
      console.log(`  Grade: ${options.grade.join(', ')}`);
      if (options.fromElens) {
        console.log(`  이렌즈 JSON: ${options.fromElens}`);
      }
      if (options.page) {
        console.log(`  대상 파일: ${options.page}`);
      }
      // TODO: Phase 2/3에서 구현
      console.log('\n  ⚠️  Phase 2/3에서 구현 예정');
    }
  );
