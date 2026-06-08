/**
 * Next.js ESLint layer for the SWAT web app.
 * Extends the shared base and relaxes a few rules that don't apply to
 * React Server/Client components (e.g. browser console in dev tooling).
 */
module.exports = {
  extends: ['@swat/eslint-config'],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  rules: {
    // React components frequently re-export types; keep import ordering strict
    // but allow default exports for pages/layouts.
    'import/no-default-export': 'off',
  },
};
