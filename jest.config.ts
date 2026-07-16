import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/(unit|integration)/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  clearMocks: true,
  // Coverage thresholds —— required by Node.js Best Practices
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/**/*.dto.ts'],
  coverageThreshold: {
    global: {
      branches: 48,
      functions: 48,
      lines: 50,
      statements: 50,
    },
  },
};

export default config;
