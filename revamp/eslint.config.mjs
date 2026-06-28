import swat from '@swat/eslint-config';

/**
 * Root ESLint flat config. Each workspace has its own `eslint.config.mjs`
 * extending the shared `@swat/eslint-config`; this root config covers loose
 * root-level files only (apps/packages are linted by their own configs).
 */
export default [
  ...swat,
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.next/',
      'coverage/',
      'apps/**',
      'packages/**',
      '**/*.d.ts',
    ],
  },
];
