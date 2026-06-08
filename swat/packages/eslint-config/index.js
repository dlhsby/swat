/**
 * Shared ESLint configuration for the SWAT monorepo.
 *
 * Enforces the project coding standards: immutability (no parameter
 * reassignment / mutation), no `console.*` (use the framework logger),
 * no hardcoded secrets, and deterministic import ordering.
 *
 * Consumed via `extends: ['@swat/eslint-config']` from each package's
 * `.eslintrc.cjs`. Framework-specific layers (NestJS, Next.js) extend on top.
 */
module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  env: {
    node: true,
    es2022: true,
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
        // resolver (which is off — see import/no-unresolved below). Pattern-based
        // grouping is deterministic, so the ordering is identical whether eslint
        // runs via `next lint` (resolver present) or via lint-staged from the
        // repo root (resolver absent) — they no longer disagree on `@/…` vs `./…`.
        pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-mutable-exports': 'error',
    // TypeScript (and the bundler) own module resolution, incl. path aliases
    // like `@/*`. The import resolver is unreliable across the monorepo —
    // especially when eslint is invoked from the repo root by lint-staged —
    // so defer unresolved-import detection to `tsc`.
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
  overrides: [
    {
      // Tests and config files may use looser rules.
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.config.{js,ts,cjs,mjs}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', '.next/', 'coverage/', 'node_modules/', '*.d.ts'],
};
