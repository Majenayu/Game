import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'client/**/*.test.ts'],
    testTimeout: 15000,
    pool: 'threads',
  },
});
