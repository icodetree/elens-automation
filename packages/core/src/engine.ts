import { readFile } from 'node:fs/promises';
import { createTwoFilesPatch } from 'diff';
import type {
  RuleDefinition,
  Violation,
  ViolationInfo,
  FixResult,
  ScanResult,
  Grade,
  Env,
} from './types.js';
import { parseHtml, serializeHtml } from './parsers/html.parser.js';
import { classifyEnv } from './classifier.js';

export interface EngineOptions {
  /** 처리할 Grade 범위 */
  grades: Grade[];
  /** 적용할 규칙 목록 */
  rules: RuleDefinition[];
}

/**
 * 파일 스캔 (위반 탐지만, 수정 없음)
 */
export async function scanFile(
  filePath: string,
  options: EngineOptions
): Promise<ScanResult> {
  const content = await readFile(filePath, 'utf-8');
  const env = classifyEnv(filePath);

  if (!env) {
    return {
      file: filePath,
      violations: [],
      env: 'html', // fallback
    };
  }

  const violations = detectViolations(content, env, filePath, options);

  return {
    file: filePath,
    violations,
    env,
  };
}

/**
 * 파일 수정 (위반 탐지 + 자동 수정)
 */
export async function fixFile(
  filePath: string,
  options: EngineOptions
): Promise<FixResult> {
  const content = await readFile(filePath, 'utf-8');
  const env = classifyEnv(filePath);

  if (!env) {
    return {
      file: filePath,
      violations: [],
      fixedCount: 0,
      skippedCount: 0,
      diff: '',
    };
  }

  const violations = detectViolations(content, env, filePath, options);

  // 수정 가능한 위반만 필터링
  const fixableViolations = violations.filter(
    (v) => v.fixable && options.grades.includes(v.grade)
  );
  const skippedViolations = violations.filter(
    (v) => !v.fixable || !options.grades.includes(v.grade)
  );

  // 수정 실행
  const { fixedContent, fixedCount } = applyFixes(
    content,
    env,
    fixableViolations,
    options.rules
  );

  // diff 생성
  const diff = createTwoFilesPatch(
    filePath,
    filePath,
    content,
    fixedContent,
    'original',
    'fixed'
  );

  return {
    file: filePath,
    violations,
    fixedCount,
    skippedCount: skippedViolations.length,
    diff,
    fixedContent: fixedCount > 0 ? fixedContent : undefined,
  };
}

/**
 * 여러 파일에 대해 엔진 실행
 */
export async function runEngine(
  filePaths: string[],
  options: EngineOptions,
  mode: 'scan' | 'fix'
): Promise<(ScanResult | FixResult)[]> {
  const results: (ScanResult | FixResult)[] = [];

  for (const filePath of filePaths) {
    if (mode === 'scan') {
      results.push(await scanFile(filePath, options));
    } else {
      results.push(await fixFile(filePath, options));
    }
  }

  return results;
}

/**
 * 위반 탐지
 */
function detectViolations(
  content: string,
  env: Env,
  filePath: string,
  options: EngineOptions
): Violation[] {
  const violations: Violation[] = [];

  if (env === 'html') {
    const { $ } = parseHtml(content);

    for (const rule of options.rules) {
      if (rule.detect.html) {
        const ruleViolations = rule.detect.html($);
        for (const v of ruleViolations) {
          violations.push({
            ...v,
            file: filePath,
          });
        }
      }
    }
  }

  // JSX/TSX는 Phase 4에서 구현
  // Vue는 Out of Scope

  return violations;
}

/**
 * 수정 적용
 */
function applyFixes(
  content: string,
  env: Env,
  violations: Violation[],
  rules: RuleDefinition[]
): { fixedContent: string; fixedCount: number } {
  let fixedCount = 0;

  if (env === 'html') {
    const { $ } = parseHtml(content);

    // duplicate-id 규칙은 역순으로 처리해야 인덱스가 꼬이지 않음
    const sortedViolations = [...violations].sort((a, b) => {
      if (a.ruleId === 'duplicate-id' && b.ruleId === 'duplicate-id') {
        const aOccurrence = (a.meta as { occurrence?: number })?.occurrence ?? 0;
        const bOccurrence = (b.meta as { occurrence?: number })?.occurrence ?? 0;
        return bOccurrence - aOccurrence; // 높은 occurrence 먼저
      }
      return 0;
    });

    for (const violation of sortedViolations) {
      const rule = rules.find((r) => r.id === violation.ruleId);
      if (rule?.fix.html) {
        const success = rule.fix.html($, violation);
        if (success) {
          fixedCount++;
        }
      }
    }

    return {
      fixedContent: serializeHtml($),
      fixedCount,
    };
  }

  // JSX/TSX는 Phase 4에서 구현
  return { fixedContent: content, fixedCount: 0 };
}
