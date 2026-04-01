import { Command } from 'commander';
import type { Env } from '@a11y-fixer/core';

export const scanCommand = new Command('scan')
  .description('소스 파일 분석 (수정 없음, 오류 목록 출력)')
  .argument('<path>', '분석할 경로')
  .option('--env <type>', '환경 타입 (html | jsx | tsx | auto)', 'auto')
  .option('--page <file>', '특정 파일만 처리')
  .action(async (path: string, options: { env: Env | 'auto'; page?: string }) => {
    console.log(`[SCAN] ${path}`);
    console.log(`  환경: ${options.env}`);
    if (options.page) {
      console.log(`  대상 파일: ${options.page}`);
    }
    // TODO: Phase 2에서 구현
    console.log('\n  ⚠️  Phase 2에서 구현 예정');
  });
