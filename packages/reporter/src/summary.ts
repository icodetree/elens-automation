import chalk from 'chalk';
import type { FixResult, Violation } from '@a11y-fixer/core';

/**
 * 콘솔 요약 출력
 */
export function printSummary(results: FixResult[]): void {
  const totalFixed = results.reduce((sum, r) => sum + r.fixedCount, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skippedCount, 0);

  console.log('\n' + chalk.bold('=== Summary ==='));
  console.log(chalk.green(`✓ ${totalFixed}개 자동 수정`));
  console.log(chalk.yellow(`⚠ ${totalSkipped}개 수동 처리 필요`));
}

/**
 * 파일별 스캔 결과 출력 (dry-run용)
 */
export function printScanResult(file: string, violations: Violation[]): void {
  console.log(`\n${chalk.bold(`[SCAN] ${file}`)}`);

  const gradeA = violations.filter((v) => v.grade === 'A' && v.fixable);
  const gradeB = violations.filter((v) => v.grade === 'B');
  const gradeC = violations.filter((v) => v.grade === 'C');

  // Grade A (자동 수정 가능)
  const ruleGroups = groupByRule(gradeA);
  for (const [ruleId, items] of Object.entries(ruleGroups)) {
    const lines = items
      .map((v) => v.line)
      .filter(Boolean)
      .join(', ');
    const lineInfo = lines ? ` (line ${lines})` : '';
    console.log(chalk.green(`  ✓ Grade A — ${ruleId}: ${items.length}개 수정 예정${lineInfo}`));
  }

  // Grade B (manual-queue)
  for (const v of gradeB) {
    console.log(chalk.yellow(`  ⚠ Grade B — ${v.ruleId}: → manual-queue 진입`));
  }

  // Grade C (manual-queue)
  for (const v of gradeC) {
    console.log(chalk.red(`  ✗ Grade C — ${v.ruleId}: → manual-queue 진입`));
  }

  console.log(
    chalk.dim(`\n  Summary: ${gradeA.length}개 자동 수정 / ${gradeB.length + gradeC.length}개 수동 처리 필요`)
  );
}

function groupByRule(violations: Violation[]): Record<string, Violation[]> {
  const groups: Record<string, Violation[]> = {};
  for (const v of violations) {
    const existing = groups[v.ruleId];
    if (existing) {
      existing.push(v);
    } else {
      groups[v.ruleId] = [v];
    }
  }
  return groups;
}
