import * as parser from '@babel/parser';
import _generate from '@babel/generator';
import type { File } from '@babel/types';

// @babel/generator는 CJS 모듈이므로 ESM interop 처리
const generate =
  typeof _generate === 'function'
    ? _generate
    : ((_generate as unknown as { default: typeof _generate }).default ?? _generate);

export interface ParsedJsx {
  ast: File;
  originalContent: string;
}

/**
 * JSX/TSX 파일 파싱
 * @babel/parser 기반, jsx + typescript 플러그인 활성화
 */
export function parseJsx(content: string): ParsedJsx {
  const ast = parser.parse(content, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  return {
    ast,
    originalContent: content,
  };
}

/**
 * 수정된 AST를 코드 문자열로 직렬화
 * retainLines: true로 원본 포맷 최대 보존
 * jsescOption minimal: true로 한글 등 비ASCII 문자를 escape하지 않음
 */
export function serializeJsx(ast: File): string {
  const result = generate(
    ast,
    {
      retainLines: true,
      concise: false,
      jsescOption: {
        minimal: true,
      },
    },
    undefined
  );
  return result.code;
}
