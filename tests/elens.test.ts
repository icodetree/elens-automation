import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadElensViolations, groupByFile, prioritizeFiles } from '../packages/cli/src/elens-adapter.js';
import type { Violation } from '@a11y-fixer/core';

const TMP_DIR = resolve(__dirname, '__tmp_elens__');

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

const sampleViolations: Violation[] = [
  {
    ruleId: 'img-alt',
    grade: 'A',
    file: '/project/src/index.html',
    selector: 'img:nth-of-type(1)',
    fixable: true,
  },
  {
    ruleId: 'html-lang',
    grade: 'A',
    file: '/project/src/index.html',
    selector: 'html',
    fixable: true,
  },
  {
    ruleId: 'input-label',
    grade: 'B',
    file: '/project/src/form.html',
    selector: 'input[name="email"]',
    fixable: false,
    suggestion: '레이블 추가 필요',
  },
];

describe('loadElensViolations', () => {
  it('should load and parse a valid Violation[] JSON file', async () => {
    const jsonPath = resolve(TMP_DIR, 'elens-export.json');
    await writeFile(jsonPath, JSON.stringify(sampleViolations), 'utf-8');

    const violations = await loadElensViolations(jsonPath);

    expect(violations.length).toBe(3);
    expect(violations[0]?.ruleId).toBe('img-alt');
    expect(violations[0]?.grade).toBe('A');
    expect(violations[0]?.file).toBe('/project/src/index.html');
  });

  it('should skip items missing required fields', async () => {
    const invalid = [
      { ruleId: 'img-alt', grade: 'A', file: '/a.html', selector: 'img', fixable: true },
      { ruleId: 'img-alt', grade: 'A', file: '/a.html' }, // selector, fixable 없음
      { ruleId: 'img-alt', grade: 'A', selector: 'img', fixable: true }, // file 없음
    ];
    const jsonPath = resolve(TMP_DIR, 'partial.json');
    await writeFile(jsonPath, JSON.stringify(invalid), 'utf-8');

    const violations = await loadElensViolations(jsonPath);
    expect(violations.length).toBe(1);
  });

  it('should throw if top-level is not an array', async () => {
    const jsonPath = resolve(TMP_DIR, 'wrong.json');
    await writeFile(jsonPath, JSON.stringify({ ruleId: 'img-alt' }), 'utf-8');

    await expect(loadElensViolations(jsonPath)).rejects.toThrow('최상위가 배열이어야 합니다');
  });
});

describe('groupByFile', () => {
  it('should group violations by file path', () => {
    const grouped = groupByFile(sampleViolations);

    expect(grouped.size).toBe(2);
    expect(grouped.get('/project/src/index.html')?.length).toBe(2);
    expect(grouped.get('/project/src/form.html')?.length).toBe(1);
  });
});

describe('prioritizeFiles', () => {
  it('should sort files by violation count descending', () => {
    const files = [
      '/project/src/form.html',
      '/project/src/index.html',
      '/project/src/other.html',
    ];

    const sorted = prioritizeFiles(files, sampleViolations);

    // index.html (2 violations) > form.html (1 violation) > other.html (0 violations)
    expect(sorted[0]).toBe('/project/src/index.html');
    expect(sorted[1]).toBe('/project/src/form.html');
    expect(sorted[2]).toBe('/project/src/other.html');
  });

  it('should return all files even if some have no elens violations', () => {
    const files = ['/a.html', '/b.html'];
    const sorted = prioritizeFiles(files, []);

    expect(sorted.length).toBe(2);
  });
});
