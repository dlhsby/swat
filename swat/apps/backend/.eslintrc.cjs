/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@swat/eslint-config'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'prisma/generated/', '*.config.js', '.eslintrc.cjs'],
  rules: {
    // NestJS controllers/providers rely on parameter decorators; allow
    // classes with only decorated members.
    '@typescript-eslint/no-extraneous-class': 'off',
  },
};
