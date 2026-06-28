import swat from '@swat/eslint-config';

/** @swat/prisma-client ESLint flat config. */
export default [...swat, { ignores: ['dist/', 'eslint.config.mjs'] }];
