import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const MODULE_INTERNALS = {
  group: ['@/modules/*/*'],
  message: 'Import a module through its public API (@/modules/<name>), not its internals.',
};

const UNGUARDED_DB = {
  name: '@akhra/db',
  importNames: ['withoutRls'],
  message:
    'withoutRls turns row-level security off, so the access check becomes yours to write. Call a module function that owns that check instead.',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'packages/db/migrations/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^https?:\\/\\/localhost/]',
          message:
            'Hardcoded localhost URL. Read the base URL from NEXT_PUBLIC_APP_URL via @/server/env instead.',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/modules/*/**', 'apps/web/src/server/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [MODULE_INTERNALS], paths: [UNGUARDED_DB] }],
    },
  },
  {
    files: ['apps/web/src/modules/*/components/**/*.{ts,tsx}', 'apps/web/src/modules/*/actions.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [UNGUARDED_DB] }],
    },
  },
  {
    files: ['apps/web/src/server/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [MODULE_INTERNALS] }],
    },
  },
  {
    files: [
      'scripts/**/*.{mjs,ts}',
      'packages/*/scripts/**/*.{mjs,ts,mts}',
      '**/*.config.{ts,mts,mjs}',
      'packages/db/src/**/*.ts',
    ],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly', fetch: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/tests/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-restricted-syntax': 'off' },
  },
);
