/**
 * Grade 분류
 * A: 자동 수정 가능 (90%+ 신뢰도)
 * B: 수정 제안만, 사람 승인 필요
 * C: 자동화 불가, manual-queue 진입
 */
export type Grade = 'A' | 'B' | 'C';

/**
 * 지원하는 파일 환경
 */
export type Env = 'html' | 'jsx' | 'tsx' | 'vue';

/**
 * 규칙 정의
 */
export interface RuleDefinition {
  /** 규칙 고유 ID (예: 'img-alt', 'html-lang') */
  id: string;
  /** KWCAG 2.2 지침 번호 (예: '1.1.1', '4.1.2') */
  kwcag: string;
  /** 자동 수정 가능 등급 */
  grade: Grade;
  /** 규칙 설명 (한글) */
  description: string;
  /** 환경별 수정 함수 */
  fix: {
    html?: HtmlFixer;
    jsx?: JsxFixer;
  };
  /** 환경별 탐지 함수 */
  detect: {
    html?: HtmlDetector;
    jsx?: JsxDetector;
  };
}

/**
 * 위반 항목
 */
export interface Violation {
  /** 규칙 ID */
  ruleId: string;
  /** 위반 등급 */
  grade: Grade;
  /** 파일 경로 */
  file: string;
  /** CSS 선택자 또는 위치 식별자 */
  selector: string;
  /** 소스 코드 라인 번호 (선택) */
  line?: number;
  /** 자동 수정 가능 여부 */
  fixable: boolean;
  /** 수동 처리 시 제안 메시지 (Grade B/C) */
  suggestion?: string;
  /** 원본 코드 스니펫 (선택) */
  original?: string;
}

/**
 * 수정 결과
 */
export interface FixResult {
  /** 파일 경로 */
  file: string;
  /** 발견된 위반 목록 */
  violations: Violation[];
  /** 자동 수정된 항목 수 */
  fixedCount: number;
  /** 스킵된 항목 수 (Grade B/C) */
  skippedCount: number;
  /** unified diff 문자열 */
  diff: string;
  /** 수정된 내용 (파일에 쓸 내용) */
  fixedContent?: string;
}

/**
 * 스캔 결과
 */
export interface ScanResult {
  /** 파일 경로 */
  file: string;
  /** 발견된 위반 목록 */
  violations: Violation[];
  /** 환경 타입 */
  env: Env;
}

/**
 * HTML 수정 함수 타입
 * @param $ - cheerio 인스턴스
 * @param element - 대상 엘리먼트
 * @returns 수정 성공 여부
 */
export type HtmlFixer = (
  $: cheerio.CheerioAPI,
  element: cheerio.Element
) => boolean;

/**
 * HTML 탐지 함수 타입
 * @param $ - cheerio 인스턴스
 * @returns 위반 항목 배열
 */
export type HtmlDetector = ($: cheerio.CheerioAPI) => Omit<Violation, 'file'>[];

/**
 * JSX/TSX 수정 함수 타입
 * @param node - Babel AST 노드
 * @returns 수정 성공 여부
 */
export type JsxFixer = (node: unknown) => boolean;

/**
 * JSX/TSX 탐지 함수 타입
 * @param ast - Babel AST
 * @returns 위반 항목 배열
 */
export type JsxDetector = (ast: unknown) => Omit<Violation, 'file'>[];

/**
 * CLI 옵션
 */
export interface CliOptions {
  /** 환경 타입 (auto면 확장자 기반 자동 감지) */
  env: Env | 'auto';
  /** dry-run 모드 */
  dryRun: boolean;
  /** 출력 디렉토리 */
  out: string;
  /** 이렌즈 JSON 파일 경로 */
  fromElens?: string;
  /** 처리할 Grade 범위 */
  grade: Grade[];
  /** 특정 파일만 처리 */
  page?: string;
}

/**
 * 검증 옵션 (verify 커맨드)
 */
export interface VerifyOptions {
  /** 스테이징 URL */
  url: string;
  /** 결과 리포트 저장 경로 */
  outReport?: string;
}

// cheerio 타입 네임스페이스 선언 (런타임에서 cheerio import)
declare namespace cheerio {
  interface CheerioAPI {
    (selector: string): Cheerio<Element>;
    html(): string;
  }
  interface Cheerio<T> {
    each(fn: (index: number, element: T) => void): this;
    attr(name: string): string | undefined;
    attr(name: string, value: string): this;
  }
  interface Element {
    tagName: string;
    attribs: Record<string, string>;
  }
}
