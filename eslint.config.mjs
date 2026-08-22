import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.ts'] },
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['backend/**/*.ts', 'frontend/**/*.ts'],
  })),
  {
    files: ['backend/**/*.ts', 'frontend/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
