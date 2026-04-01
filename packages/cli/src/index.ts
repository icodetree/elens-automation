import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { fixCommand } from './commands/fix.js';
import { verifyCommand } from './commands/verify.js';

const program = new Command();

program
  .name('a11y-fixer')
  .description('KWCAG 2.2 기반 웹 접근성 오류 자동 수정 CLI')
  .version('0.1.0');

program.addCommand(scanCommand);
program.addCommand(fixCommand);
program.addCommand(verifyCommand);

program.parse();
