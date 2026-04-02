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
  tabindexPositiveRule,
  linkBlankRelRule,
  divOnclickRoleRule,
  tableScopeRule,
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

describe('tabindex-positive rule', () => {
  it('should detect elements with positive tabindex', async () => {
    const before = await loadFixture('tabindex-positive', 'before');
    const { $ } = parseHtml(before);

    const violations = tabindexPositiveRule.detect.html!($);

    // tabindex="1", tabindex="2", tabindex="3" → 3개 위반
    expect(violations.length).toBe(3);
    expect(violations.every((v) => v.ruleId === 'tabindex-positive')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
    expect(violations.every((v) => v.fixable)).toBe(true);
  });

  it('should not detect tabindex="0" or tabindex="-1"', async () => {
    const html = `
      <input tabindex="0" />
      <span tabindex="-1">hidden</span>
    `;
    const { $ } = parseHtml(html);
    const violations = tabindexPositiveRule.detect.html!($);
    expect(violations.length).toBe(0);
  });

  it('should fix positive tabindex to 0', async () => {
    const before = await loadFixture('tabindex-positive', 'before');
    const after = await loadFixture('tabindex-positive', 'after');

    const { $ } = parseHtml(before);
    const violations = tabindexPositiveRule.detect.html!($);

    for (const violation of violations) {
      tabindexPositiveRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('link-blank-rel rule', () => {
  it('should detect target="_blank" links without noopener', async () => {
    const before = await loadFixture('link-blank-rel', 'before');
    const { $ } = parseHtml(before);

    const violations = linkBlankRelRule.detect.html!($);

    // rel 없음 1개 + rel에 noopener 없음 1개 = 2개
    expect(violations.length).toBe(2);
    expect(violations.every((v) => v.ruleId === 'link-blank-rel')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
    expect(violations.every((v) => v.fixable)).toBe(true);
  });

  it('should not detect links without target="_blank"', async () => {
    const html = '<a href="/internal">내부 링크</a>';
    const { $ } = parseHtml(html);
    const violations = linkBlankRelRule.detect.html!($);
    expect(violations.length).toBe(0);
  });

  it('should not detect links with noopener already set', async () => {
    const html = '<a href="https://safe.com" target="_blank" rel="noopener noreferrer">링크</a>';
    const { $ } = parseHtml(html);
    const violations = linkBlankRelRule.detect.html!($);
    expect(violations.length).toBe(0);
  });

  it('should fix by adding noopener noreferrer', async () => {
    const before = await loadFixture('link-blank-rel', 'before');
    const after = await loadFixture('link-blank-rel', 'after');

    const { $ } = parseHtml(before);
    const violations = linkBlankRelRule.detect.html!($);

    for (const violation of violations) {
      linkBlankRelRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('div-onclick-role rule', () => {
  it('should detect div/span with onclick but no role', async () => {
    const before = await loadFixture('div-onclick-role', 'before');
    const { $ } = parseHtml(before);

    const violations = divOnclickRoleRule.detect.html!($);

    // div onclick 1개 + span onclick 1개 + div onclick+tabindex 1개 = 3개
    expect(violations.length).toBe(3);
    expect(violations.every((v) => v.ruleId === 'div-onclick-role')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
    expect(violations.every((v) => v.fixable)).toBe(true);
  });

  it('should not detect div with role already set', async () => {
    const html = '<div role="button" onclick="test()" tabindex="0">버튼</div>';
    const { $ } = parseHtml(html);
    const violations = divOnclickRoleRule.detect.html!($);
    expect(violations.length).toBe(0);
  });

  it('should not detect div without onclick', async () => {
    const html = '<div>일반 div</div>';
    const { $ } = parseHtml(html);
    const violations = divOnclickRoleRule.detect.html!($);
    expect(violations.length).toBe(0);
  });

  it('should fix by adding role="button" and tabindex="0"', async () => {
    const before = await loadFixture('div-onclick-role', 'before');
    const after = await loadFixture('div-onclick-role', 'after');

    const { $ } = parseHtml(before);
    const violations = divOnclickRoleRule.detect.html!($);

    for (const violation of violations) {
      divOnclickRoleRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});

describe('table-scope rule', () => {
  it('should detect th elements without scope', async () => {
    const before = await loadFixture('table-scope', 'before');
    const { $ } = parseHtml(before);

    const violations = tableScopeRule.detect.html!($);

    // thead th 3개 + tbody th (scope 없는 것) 1개 = 4개
    expect(violations.length).toBe(4);
    expect(violations.every((v) => v.ruleId === 'table-scope')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
    expect(violations.every((v) => v.fixable)).toBe(true);
  });

  it('should not detect th elements that already have scope', async () => {
    const html = '<table><thead><tr><th scope="col">이름</th></tr></thead></table>';
    const { $ } = parseHtml(html);
    const violations = tableScopeRule.detect.html!($);
    expect(violations.length).toBe(0);
  });

  it('should assign scope="col" to thead th and scope="row" to first tbody th', async () => {
    const before = await loadFixture('table-scope', 'before');
    const violations_before = (() => {
      const { $ } = parseHtml(before);
      return tableScopeRule.detect.html!($);
    })();

    // thead th는 scope="col", 첫 번째 tbody th는 scope="row"
    const theadViolations = violations_before.filter(
      (v) => (v.meta as { scopeValue?: string })?.scopeValue === 'col'
    );
    const tbodyViolations = violations_before.filter(
      (v) => (v.meta as { scopeValue?: string })?.scopeValue === 'row'
    );

    expect(theadViolations.length).toBe(3);
    expect(tbodyViolations.length).toBe(1);
  });

  it('should fix by adding correct scope attributes', async () => {
    const before = await loadFixture('table-scope', 'before');
    const after = await loadFixture('table-scope', 'after');

    const { $ } = parseHtml(before);
    const violations = tableScopeRule.detect.html!($);

    for (const violation of violations) {
      tableScopeRule.fix.html!($, violation);
    }

    const result = serializeHtml($);

    expect(normalizeHtml(result)).toBe(normalizeHtml(after));
  });
});
