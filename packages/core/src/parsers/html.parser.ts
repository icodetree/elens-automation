import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

export interface ParsedHtml {
  $: CheerioAPI;
  originalContent: string;
}

/**
 * HTML 파일 파싱
 */
export function parseHtml(content: string): ParsedHtml {
  const $ = cheerio.load(content);

  return {
    $,
    originalContent: content,
  };
}

/**
 * 수정된 HTML을 문자열로 출력
 * DOCTYPE과 원본 포맷을 최대한 보존
 */
export function serializeHtml($: CheerioAPI): string {
  return $.html();
}

export type { CheerioAPI };
