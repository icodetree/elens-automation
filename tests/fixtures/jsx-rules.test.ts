import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseJsx, serializeJsx } from '@a11y-fixer/core';
import { imgAltRule, inputLabelRule, buttonNameRule } from '@a11y-fixer/rules';

const FIXTURES_DIR = resolve(__dirname, '.');

async function loadJsxFixture(ruleName: string, type: 'before' | 'after'): Promise<string> {
  const path = resolve(FIXTURES_DIR, ruleName, `${type}.jsx`);
  return readFile(path, 'utf-8');
}

/**
 * JSX 코드 정규화
 * parseJsx → serializeJsx를 거쳐 동일한 생성기 형식으로 맞춘 뒤 공백 정규화
 */
function normalizeCode(code: string): string {
  // @babel/generator의 출력 형식으로 정규화
  const { ast } = parseJsx(code);
  const serialized = serializeJsx(ast);
  return serialized
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
// img-alt JSX 규칙 테스트
// ─────────────────────────────────────────────

describe('img-alt JSX rule', () => {
  it('should detect img elements missing alt attribute', async () => {
    const before = await loadJsxFixture('img-alt', 'before');
    const { ast } = parseJsx(before);

    const violations = imgAltRule.detect.jsx!(ast);

    // before.jsx에는 alt 없는 img가 2개 (케이스 1, 5)
    expect(violations.length).toBe(2);
    expect(violations.every((v) => v.ruleId === 'img-alt')).toBe(true);
    expect(violations.every((v) => v.grade === 'A')).toBe(true);
    expect(violations.every((v) => v.fixable)).toBe(true);
  });

  it('should skip img with role=presentation', async () => {
    const code = `
import React from 'react';
export default function C() {
  return <img src="d.png" role="presentation" />;
}
    `.trim();
    const { ast } = parseJsx(code);
    const violations = imgAltRule.detect.jsx!(ast);
    expect(violations.length).toBe(0);
  });

  it('should skip img with aria-hidden=true', async () => {
    const code = `
import React from 'react';
export default function C() {
  return <img src="d.png" aria-hidden="true" />;
}
    `.trim();
    const { ast } = parseJsx(code);
    const violations = imgAltRule.detect.jsx!(ast);
    expect(violations.length).toBe(0);
  });

  it('should fix img elements by adding alt=""', async () => {
    const before = await loadJsxFixture('img-alt', 'before');
    const after = await loadJsxFixture('img-alt', 'after');

    const { ast } = parseJsx(before);
    const violations = imgAltRule.detect.jsx!(ast);

    for (const violation of violations) {
      imgAltRule.fix.jsx!(ast, violation);
    }

    const result = serializeJsx(ast);

    expect(normalizeCode(result)).toBe(normalizeCode(after));
  });
});

// ─────────────────────────────────────────────
// input-label JSX 규칙 테스트
// ─────────────────────────────────────────────

describe('input-label JSX rule', () => {
  it('should detect input elements without accessible name', async () => {
    const before = await loadJsxFixture('input-label', 'before');
    const { ast } = parseJsx(before);

    const violations = inputLabelRule.detect.jsx!(ast);

    // placeholder 있는 것 1개 (Grade A) + 아무것도 없는 것 1개 (Grade B)
    expect(violations.length).toBe(2);

    const gradeA = violations.filter((v) => v.grade === 'A');
    const gradeB = violations.filter((v) => v.grade === 'B');

    expect(gradeA.length).toBe(1);
    expect(gradeB.length).toBe(1);
  });

  it('should skip hidden/submit/button/image/reset input types', async () => {
    const code = `
import React from 'react';
export default function C() {
  return (
    <div>
      <input type="hidden" />
      <input type="submit" />
      <input type="button" />
      <input type="image" />
      <input type="reset" />
    </div>
  );
}
    `.trim();
    const { ast } = parseJsx(code);
    const violations = inputLabelRule.detect.jsx!(ast);
    expect(violations.length).toBe(0);
  });

  it('should skip input with aria-label', async () => {
    const code = `
import React from 'react';
export default function C() {
  return <input type="text" aria-label="이름" />;
}
    `.trim();
    const { ast } = parseJsx(code);
    const violations = inputLabelRule.detect.jsx!(ast);
    expect(violations.length).toBe(0);
  });

  it('should fix Grade A input by adding aria-label from placeholder', async () => {
    const before = await loadJsxFixture('input-label', 'before');
    const after = await loadJsxFixture('input-label', 'after');

    const { ast } = parseJsx(before);
    const violations = inputLabelRule.detect.jsx!(ast);

    // Grade A만 수정
    for (const violation of violations.filter((v) => v.fixable)) {
      inputLabelRule.fix.jsx!(ast, violation);
    }

    const result = serializeJsx(ast);

    expect(normalizeCode(result)).toBe(normalizeCode(after));
  });
});

// ─────────────────────────────────────────────
// button-name JSX 규칙 테스트
// ─────────────────────────────────────────────

describe('button-name JSX rule', () => {
  it('should detect buttons without accessible name', async () => {
    const before = await loadJsxFixture('button-name', 'before');
    const { ast } = parseJsx(before);

    const violations = buttonNameRule.detect.jsx!(ast);

    // img alt 있는 것 1개 (Grade A) + 빈 버튼 1개 (Grade B)
    expect(violations.length).toBe(2);

    const gradeA = violations.filter((v) => v.grade === 'A');
    const gradeB = violations.filter((v) => v.grade === 'B');

    expect(gradeA.length).toBe(1);
    expect(gradeB.length).toBe(1);
  });

  it('should skip button with text content', async () => {
    const code = `
import React from 'react';
export default function C() {
  return <button>저장</button>;
}
    `.trim();
    const { ast } = parseJsx(code);
    const violations = buttonNameRule.detect.jsx!(ast);
    expect(violations.length).toBe(0);
  });

  it('should skip button with aria-label', async () => {
    const code = `
import React from 'react';
export default function C() {
  return <button aria-label="닫기">×</button>;
}
    `.trim();
    const { ast } = parseJsx(code);
    const violations = buttonNameRule.detect.jsx!(ast);
    expect(violations.length).toBe(0);
  });

  it('should fix Grade A button by adding aria-label from inner img alt', async () => {
    const before = await loadJsxFixture('button-name', 'before');
    const after = await loadJsxFixture('button-name', 'after');

    const { ast } = parseJsx(before);
    const violations = buttonNameRule.detect.jsx!(ast);

    // Grade A만 수정
    for (const violation of violations.filter((v) => v.fixable)) {
      buttonNameRule.fix.jsx!(ast, violation);
    }

    const result = serializeJsx(ast);

    expect(normalizeCode(result)).toBe(normalizeCode(after));
  });
});
