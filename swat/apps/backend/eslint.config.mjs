import swat from '@swat/eslint-config';

/** Backend (NestJS) ESLint flat config. */
export default [
  ...swat,
  {
    // Type-aware parsing (TS files only) so `consistent-type-imports` honours
    // `emitDecoratorMetadata` and does NOT rewrite NestJS DI imports to
    // `import type` (which would erase the runtime metadata and break injection).
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NestJS controllers/providers rely on parameter decorators; allow
      // classes with only decorated members.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    ignores: ['dist/', 'prisma/generated/', 'postman/', '**/*.config.js', 'eslint.config.mjs'],
  },
];
