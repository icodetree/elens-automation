import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHtml, serializeHtml } from '@a11y-fixer/core';
import {
  htmlLangRule,
  imgAltRule,
  inputLabelRule,
  buttonNameRule,
  duplicateIdRule,
} from '@a11y-fixer/rules';
import type { ViolationInfo } from '@a11y-fixer/core';

const FIXTURES_DIR = resolve(__dirname, '.');

async function loadFixture(ruleName: string, type: 'before' | 'after'): Promise<string> {
  const path = resolve(FIXTURES_DIR, ruleName, `${type}.html`);
  return readFile(path, 'utf-8');
}

function normalizeHtml(html: string): string {
  // 공백과 줄바꿈 정규화
  return html
    .replace(/\r\n/g, '\n')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('html-lang rule', () => {
  it('should detect missing lang attribute', async () => {
    const before = await loadFixture('html-lang', 'before');
    const { $ } = parseHtml(before);

    const violations = htmlLangRule.detect.html!($);

    expect(violations.length).toBe(1);
    expect(violations[0]?.ruleId).toBe('html-lang');
    expect(violations[0]?.grade).toBe('A');
    expect(violations[0]?.fixable).toBe(true);
  });

  it('should fix missing lang attribute', async () => {
    const before = await loadFixture('html-lang', 'before');
    const after = await loadFixture('html-lang', 'after');

    const { $ } = parseHtml(before);
    const violations = htmlLangRule.detect.html!($);

    for (const violation of violations) {
      htmlLangRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('img-alt rule', () => {
  it('should detect missing alt attribute', async () => {
    const before = await loadFixture('img-alt', 'before');
    const { $ } = parseHtml(before);

    const violations = imgAltRule.detect.html!($);

    // before.html에는 2개의 img에 alt가 없음
    expect(violations.length).toBe(2);
    expect(violations.every((v) => v.ruleId === 'img-alt')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
    expect(violations.every((v) => v.fixable)).toBe(true);
  });

  it('should not detect img with role=presentation', async () => {
    const html = '<img src="divider.png" role="presentation">';
    const { $ } = parseHtml(html);

    const violations = imgAltRule.detect.html!($);

    expect(violations.length).toBe(0);
  });

  it('should fix missing alt attribute with empty alt', async () => {
    const before = await loadFixture('img-alt', 'before');
    const after = await loadFixture('img-alt', 'after');

    const { $ } = parseHtml(before);
    const violations = imgAltRule.detect.html!($);

    for (const violation of violations) {
      imgAltRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('input-label rule', () => {
  it('should detect input without label', async () => {
    const before = await loadFixture('input-label', 'before');
    const { $ } = parseHtml(before);

    const violations = inputLabelRule.detect.html!($);

    // placeholder가 있는 것 1개 (Grade A) + 아무것도 없는 것 1개 (Grade B)
    expect(violations.length).toBe(2);

    const gradeA = violations.filter((v) => v.grade === 'A');
    const gradeB = violations.filter((v) => v.grade === 'B');

    expect(gradeA.length).toBe(1);
    expect(gradeB.length).toBe(1);
  });

  it('should fix input with placeholder by adding aria-label', async () => {
    const before = await loadFixture('input-label', 'before');
    const after = await loadFixture('input-label', 'after');

    const { $ } = parseHtml(before);
    const violations = inputLabelRule.detect.html!($);

    // Grade A만 수정
    for (const violation of violations.filter((v) => v.fixable)) {
      inputLabelRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('button-name rule', () => {
  it('should detect button without accessible name', async () => {
    const before = await loadFixture('button-name', 'before');
    const { $ } = parseHtml(before);

    const violations = buttonNameRule.detect.html!($);

    // img alt가 있는 것 1개 (Grade A) + 빈 버튼 1개 (Grade B)
    expect(violations.length).toBe(2);

    const gradeA = violations.filter((v) => v.grade === 'A');
    const gradeB = violations.filter((v) => v.grade === 'B');

    expect(gradeA.length).toBe(1);
    expect(gradeB.length).toBe(1);
  });

  it('should fix button with inner img alt', async () => {
    const before = await loadFixture('button-name', 'before');
    const after = await loadFixture('button-name', 'after');

    const { $ } = parseHtml(before);
    const violations = buttonNameRule.detect.html!($);

    // Grade A만 수정
    for (const violation of violations.filter((v) => v.fixable)) {
      buttonNameRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('duplicate-id rule', () => {
  it('should detect duplicate ids', async () => {
    const before = await loadFixture('duplicate-id', 'before');
    const { $ } = parseHtml(before);

    const violations = duplicateIdRule.detect.html!($);

    // duplicate: 2개 중복 + another: 1개 중복 = 3개
    expect(violations.length).toBe(3);
    expect(violations.every((v) => v.ruleId === 'duplicate-id')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
  });

  it('should fix duplicate ids with suffix', async () => {
    const before = await loadFixture('duplicate-id', 'before');
    const after = await loadFixture('duplicate-id', 'after');

    const { $ } = parseHtml(before);
    const violations = duplicateIdRule.detect.html!($);

    // 역순으로 처리해야 인덱스가 꼬이지 않음
    for (const violation of [...violations].reverse()) {
      duplicateIdRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});
