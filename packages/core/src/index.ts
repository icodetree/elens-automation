// Types
export type {
  Grade,
  Env,
  ViolationInfo,
  Violation,
  RuleDefinition,
  FixResult,
  ScanResult,
  HtmlFixer,
  HtmlDetector,
  JsxFixer,
  JsxDetector,
  CliOptions,
  VerifyOptions,
  CheerioAPI,
  Element,
} from './types.js';

// Classifier
export { classifyEnv, getSupportedExtensions, isSupportedEnv } from './classifier.js';

// Parsers
export { parseHtml, serializeHtml } from './parsers/html.parser.js';

// Engine (아래에서 구현)
export { runEngine, scanFile, fixFile } from './engine.js';
