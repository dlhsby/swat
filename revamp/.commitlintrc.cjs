/**
 * Conventional Commits enforcement for the SWAT monorepo.
 * Validated by the Husky `commit-msg` hook.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'test', 'chore', 'docs', 'refactor', 'perf', 'ci', 'build', 'revert'],
    ],
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
