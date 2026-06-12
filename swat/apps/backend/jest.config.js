/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  // Unit specs live under src/ (app logic) and ../scripts/ (migration tooling,
  // coverage-exempt — collectCoverageFrom below is scoped to src/).
  roots: ['<rootDir>', '<rootDir>/../scripts'],
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
    '!**/*.d.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.types.ts',
    '!**/main.ts',
    '!**/*.controller.ts',
    '!**/*.repository.ts',
    '!**/session.ts',
    '!**/configure-app.ts',
    '!**/prisma.service.ts',
    // Thin external-SDK wrapper (AWS S3 presign/put/delete) — no branching logic;
    // exercised against live MinIO in integration, like the repositories above.
    '!**/storage.service.ts',
    '!**/index.ts',
    '!**/common/pipes/validation.pipe.ts',
    '!**/common/decorators/current-user.decorator.ts',
  ],
  coverageDirectory: '../coverage',
  // Ratcheted to lock in the achieved logic-layer coverage (≈97.8/82.6/98/97.7);
  // a small margin below avoids CI flakiness on unrelated refactors.
  coverageThreshold: {
    global: { statements: 96, branches: 81, functions: 96, lines: 96 },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
