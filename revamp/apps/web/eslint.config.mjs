import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

import swatNext from '@swat/eslint-config/next';

/**
 * Web (Next.js) ESLint flat config. Composes the shared Next flat layer with the
 * Next.js plugin's `recommended` + `core-web-vitals` rules and the React Hooks
 * rules (registered directly to avoid the duplicate `import`-plugin conflict that
 * eslint-config-next's bundled flat config would cause).
 */
export default [
  ...swatNext,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    settings: { next: { rootDir: import.meta.dirname } },
  },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Tests may render raw <a> elements to exercise primitives.
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'next-env.d.ts',
      '**/*.config.{js,ts,mjs}',
      'eslint.config.mjs',
    ],
  },
];
