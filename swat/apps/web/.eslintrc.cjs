/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@swat/eslint-config/next', 'next/core-web-vitals'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  // Pin the Next.js app root so rules like `no-html-link-for-pages` resolve the
  // app (and detect the App Router) even when eslint runs from the monorepo
  // root, e.g. lint-staged invoking eslint from inner `swat/`.
  settings: {
    next: {
      rootDir: __dirname,
    },
  },
  ignorePatterns: ['.next/', 'node_modules/', 'next-env.d.ts', '*.config.{js,ts,mjs}'],
};
