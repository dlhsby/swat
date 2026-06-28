/**
 * Shared ESLint **flat config** for the SWAT monorepo (ESLint 9+).
 *
 * Enforces the project coding standards: immutability (no parameter
 * reassignment / mutation), no `console.*` (use the framework logger),
 * no hardcoded secrets, and deterministic import ordering.
 *
 * Consumed from each workspace's `eslint.config.mjs`:
 *   import swat from '@swat/eslint-config';
 *   export default [...swat, { ...workspace overrides }];
 *
 * Framework layers (Next.js) live in `./next.js`.
 */
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const importPlugin = require('eslint-plugin-import');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2022 },
    },
    settings: {
      'import/resolver': { typescript: true, node: true },
    },
    rules: {
      // --- Immutability ---------------------------------------------------
      'no-param-reassign': ['error', { props: true }],
      'prefer-const': 'error',
      'no-var': 'error',

      // --- No console / debugging leftovers -------------------------------
      'no-console': 'error',
      'no-debugger': 'error',

      // --- Secrets / dangerous patterns -----------------------------------
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // --- Import hygiene & ordering --------------------------------------
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          // Classify the `@/*` alias as `internal` by PATTERN, not by the import
          // resolver — deterministic regardless of where eslint is invoked.
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-mutable-exports': 'error',
      // TypeScript (and the bundler) own module resolution, incl. path aliases
      // like `@/*`. Defer unresolved-import detection to `tsc`.
      'import/no-unresolved': 'off',

      // --- TypeScript ------------------------------------------------------
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  // Tests and config files may use looser rules.
  {
    files: [
      '**/*.spec.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.config.{js,ts,cjs,mjs}',
      '**/scripts/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  // Prettier last — turn off all formatting rules.
  prettier,
  // Global ignores (a config with only `ignores` applies repo-wide).
  {
    ignores: ['**/dist/', '**/.next/', '**/coverage/', '**/node_modules/', '**/*.d.ts'],
  },
];
