import { defineConfig } from 'vitest/config';

// Root config only runs the end-to-end tests. Each workspace has its own config.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['e2e/**/*.test.ts'],
  },
});
