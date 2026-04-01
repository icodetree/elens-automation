import { Command } from 'commander';

export const verifyCommand = new Command('verify')
  .description('수정 후 URL 기반 axe-core 재검증')
  .requiredOption('--url <url>', '재검증할 스테이징 URL')
  .option('--out-report <file>', '검증 결과 JSON 저장 경로')
  .action(async (options: { url: string; outReport?: string }) => {
    console.log(`[VERIFY] ${options.url}`);
    if (options.outReport) {
      console.log(`  리포트 출력: ${options.outReport}`);
    }
    // TODO: Phase 5에서 구현
    console.log('\n  ⚠️  Phase 5에서 구현 예정');
  });
