/**
 * Root ESLint configuration. Individual workspaces provide their own
 * `.eslintrc.cjs` that extends the shared `@swat/eslint-config` (and, for the
 * web app, the Next.js layer). This root config covers loose root-level files.
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@swat/eslint-config'],
  parserOptions: {
    project: false,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'coverage/',
    'apps/**',
    'packages/**',
    '**/*.d.ts',
  ],
};
