import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['backend/src/**/*.spec.ts'],
    environment: 'node',
  },
});
