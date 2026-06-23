module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  globalSetup: './test/setup/global-setup.ts',
  globalTeardown: './test/setup/global-teardown.ts',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@users/(.*)$': '<rootDir>/src/users/$1',
    '^@products/(.*)$': '<rootDir>/src/products/$1',
    '^@categories/(.*)$': '<rootDir>/src/categories/$1',
    '^@sales/(.*)$': '<rootDir>/src/sales/$1',
    '^@reports/(.*)$': '<rootDir>/src/reports/$1'
  },
};
