/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@swat/eslint-config/next', 'next/core-web-vitals'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.next/', 'node_modules/', 'next-env.d.ts', '*.config.{js,ts,mjs}'],
};
