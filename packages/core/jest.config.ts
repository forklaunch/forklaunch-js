// import type { Config } from 'jest';

const config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['dist/', 'node_modules/']
};

export default config;
