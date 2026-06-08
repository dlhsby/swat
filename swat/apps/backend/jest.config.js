/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  setupFiles: ['<rootDir>/../test/jest.setup.ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  // Unit-coverage scope = the logic layer. Controllers (HTTP wiring) and
  // repositories (thin Prisma wrappers) are exercised by the e2e suite against
  // real infra, not unit tests; boot/config files and type-only modules carry no
  // testable logic.
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.types.ts',
    '!**/main.ts',
    '!**/*.controller.ts',
    '!**/*.repository.ts',
    '!**/session.ts',
    '!**/configure-app.ts',
    '!**/prisma.service.ts',
    '!**/index.ts',
    '!**/common/pipes/validation.pipe.ts',
    '!**/common/decorators/current-user.decorator.ts',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: { statements: 90, branches: 78, functions: 90, lines: 90 },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
