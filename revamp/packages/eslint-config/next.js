/**
 * Next.js ESLint **flat** layer for the SWAT web app (ESLint 9+).
 * Extends the shared base with browser globals and relaxes default-export
 * (pages/layouts are default exports). The Next.js plugin rules themselves are
 * composed in the web app's own `eslint.config.mjs` (via eslint-config-next).
 */
const globals = require('globals');

const base = require('./index.js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'import/no-default-export': 'off',
    },
  },
];
