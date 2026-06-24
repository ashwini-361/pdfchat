import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/*.ollama-live.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'apps/api/src/**/*.ts',
        'packages/browser-runtime/src/**/*.ts',
        'packages/rag-core/src/**/*.ts',
        'packages/shared/src/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.ollama-live.test.ts'],
    },
  },
});
