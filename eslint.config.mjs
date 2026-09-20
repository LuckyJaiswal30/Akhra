import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * `withoutRls` runs a query with the database's full powers: row-level security is off, and whether
 * the caller may see or change those rows becomes the code's own responsibility. That responsibility
 * belongs in a service or query file, beside the check that enforces it — never in a page, a route,
 * a component or a server action, where a missing check is invisible.
 */
const MODULE_INTERNALS = {
  group: ['@/modules/*/*'],
  message:
    'Import a module through its public API (@/modules/<name>), not its internals. See src/modules/README.md.',
};

const UNGUARDED_DB = {
  name: '@akhra/db',
  importNames: ['withoutRls'],
  message:
    'withoutRls turns row-level security off, so the access check becomes yours to write. Call a module function that owns that check instead — see src/modules/README.md.',
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
    /**
     * Inside a module, the same database rule for the files that must never hold an access check.
     * The module-boundary rule is deliberately not applied here: a client component reaching another
     * module's component imports that file directly, because going through the module's index would
     * pull its server-only services into the browser bundle.
     */
    files: ['apps/web/src/modules/*/components/**/*.{ts,tsx}', 'apps/web/src/modules/*/actions.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [UNGUARDED_DB] }],
    },
  },
  {
    /**
     * `src/server` is the layer underneath the modules: session, identity linking, rate limiting.
     * Some of it runs before there is an actor to check, so the bypass is its job, not a smell.
     */
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
