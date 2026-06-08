/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@swat/eslint-config'],
  parserOptions: { tsconfigRootDir: __dirname },
  ignorePatterns: ['dist/', 'node_modules/', '.eslintrc.cjs'],
};
