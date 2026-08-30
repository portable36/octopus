import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const frontendSource = fileURLToPath(new URL('./frontend/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(frontendSource),
    },
  },
  test: {
    include: ['backend/src/**/*.spec.ts', 'frontend/src/**/*.spec.ts'],
    environment: 'node',
  },
});
