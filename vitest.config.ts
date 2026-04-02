import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@a11y-fixer/core': resolve(__dirname, 'packages/core/dist/index.js'),
      '@a11y-fixer/rules': resolve(__dirname, 'rules/dist/index.js'),
      '@a11y-fixer/reporter': resolve(__dirname, 'packages/reporter/dist/index.js'),
    },
  },
});
