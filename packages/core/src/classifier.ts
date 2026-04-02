import type { Env } from './types.js';
import { extname } from 'node:path';

const EXT_MAP: Record<string, Env> = {
  '.html': 'html',
  '.htm': 'html',
  '.jsx': 'jsx',
  '.tsx': 'tsx',
  '.vue': 'vue',
};

/**
 * 파일 경로에서 환경 타입 자동 감지
 */
export function classifyEnv(filePath: string): Env | null {
  const ext = extname(filePath).toLowerCase();
  return EXT_MAP[ext] ?? null;
}

/**
 * 지원하는 파일 확장자 목록
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXT_MAP);
}

/**
 * 현재 지원하는 환경인지 확인
 */
export function isSupportedEnv(env: Env): boolean {
  return env === 'html' || env === 'jsx' || env === 'tsx';
}
