import swat from '@swat/eslint-config';

/** @swat/schemas ESLint flat config. */
export default [...swat, { ignores: ['dist/', 'eslint.config.mjs'] }];
