import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { scanFile, fixFile } from '@a11y-fixer/core';
import { rules } from '@a11y-fixer/rules';
import { writeManualQueue } from '@a11y-fixer/reporter';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const TMP_DIR = resolve(__dirname, '__tmp__');

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('scan command (engine)', () => {
  it('should detect violations in html-lang/before.html', async () => {
    const file = resolve(FIXTURES_DIR, 'html-lang/before.html');
    const result = await scanFile(file, { grades: ['A', 'B', 'C'], rules });

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.ruleId === 'html-lang')).toBe(true);
    expect(result.env).toBe('html');
  });

  it('should return no violations for a clean file', async () => {
    const file = resolve(FIXTURES_DIR, 'html-lang/after.html');
    const result = await scanFile(file, { grades: ['A', 'B', 'C'], rules });

    const htmlLangViolations = result.violations.filter((v) => v.ruleId === 'html-lang');
    expect(htmlLangViolations.length).toBe(0);
  });

  it('should detect Grade A and B violations', async () => {
    const file = resolve(FIXTURES_DIR, 'input-label/before.html');
    const result = await scanFile(file, { grades: ['A', 'B', 'C'], rules });

    const gradeA = result.violations.filter((v) => v.grade === 'A');
    const gradeB = result.violations.filter((v) => v.grade === 'B');

    expect(gradeA.length).toBeGreaterThan(0);
    expect(gradeB.length).toBeGreaterThan(0);
  });
});

describe('fix command (engine)', () => {
  it('should fix html-lang and return fixedContent', async () => {
    const file = resolve(FIXTURES_DIR, 'html-lang/before.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    expect(result.fixedCount).toBe(1);
    expect(result.fixedContent).toBeDefined();
    expect(result.fixedContent).toContain('lang="ko"');
  });

  it('should produce a diff when fixes are applied', async () => {
    const file = resolve(FIXTURES_DIR, 'img-alt/before.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    expect(result.fixedCount).toBe(2);
    expect(result.diff).toContain('alt=""');
  });

  it('should not modify file when no fixable violations found', async () => {
    const file = resolve(FIXTURES_DIR, 'html-lang/after.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    expect(result.fixedContent).toBeUndefined();
  });

  it('should skip Grade B violations when grade=A', async () => {
    const file = resolve(FIXTURES_DIR, 'input-label/before.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    // Grade B는 fixedCount에 포함되지 않음
    const gradeBViolations = result.violations.filter((v) => v.grade === 'B');
    expect(gradeBViolations.every((v) => !v.fixable || v.grade !== 'A')).toBe(true);
    expect(result.skippedCount).toBeGreaterThan(0);
  });
});

describe('fixed/ folder output', () => {
  it('should write fixed content to output path', async () => {
    const { writeFile, mkdir: mkdirFs } = await import('node:fs/promises');
    const { dirname } = await import('node:path');

    const file = resolve(FIXTURES_DIR, 'html-lang/before.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    expect(result.fixedContent).toBeDefined();

    const outputPath = resolve(TMP_DIR, 'before.html');
    await mkdirFs(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, result.fixedContent!, 'utf-8');

    const saved = await readFile(outputPath, 'utf-8');
    expect(saved).toContain('lang="ko"');
  });
});

describe('manual-queue.json generation', () => {
  it('should write Grade B/C violations to manual-queue.json', async () => {
    const file = resolve(FIXTURES_DIR, 'input-label/before.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    const gradeB = result.violations.filter(
      (v) => v.grade === 'B' || v.grade === 'C'
    );
    expect(gradeB.length).toBeGreaterThan(0);

    const queuePath = resolve(TMP_DIR, 'manual-queue.json');
    await writeManualQueue(gradeB, queuePath);

    const saved = await readFile(queuePath, 'utf-8');
    const parsed = JSON.parse(saved) as unknown[];

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(gradeB.length);

    const firstItem = parsed[0] as Record<string, unknown>;
    expect(firstItem).toHaveProperty('ruleId');
    expect(firstItem).toHaveProperty('grade');
    expect(firstItem).toHaveProperty('file');
    expect(firstItem).toHaveProperty('fixable', false);
  });

  it('should serialize violations matching Violation[] schema', async () => {
    const file = resolve(FIXTURES_DIR, 'button-name/before.html');
    const result = await fixFile(file, { grades: ['A'], rules });

    const manualItems = result.violations.filter((v) => !v.fixable || v.grade !== 'A');
    const queuePath = resolve(TMP_DIR, 'manual-queue.json');
    await writeManualQueue(manualItems, queuePath);

    const saved = await readFile(queuePath, 'utf-8');
    const parsed = JSON.parse(saved) as Array<Record<string, unknown>>;

    for (const item of parsed) {
      expect(item).toHaveProperty('ruleId');
      expect(item).toHaveProperty('grade');
      expect(item).toHaveProperty('selector');
      expect(item).toHaveProperty('fixable');
    }
  });
});
