import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import turbo from 'eslint-config-turbo/flat'
import tseslint from 'typescript-eslint'

export const baseConfig = tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...turbo,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettier,
)
