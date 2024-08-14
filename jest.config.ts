// import type { Config } from 'jest';

// const config: Config = {
//   verbose: true,
//   preset: 'ts-jest',
//   testEnvironment: 'node',
//   testPathIgnorePatterns: ['dist/', 'node_modules/'],
//   transform: {
//     '^.+\\.[tj]sx?$': [
//       'ts-jest',
//       {
//         useESM: true
//       }
//     ]
//   }
// };

// export default config;

// jest.config.ts
import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  // [...]
  preset: 'ts-jest/presets/default-esm', // or other ESM presets
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process ts,js,tsx,jsx with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process ts,js,tsx,jsx,mts,mjs,mtsx,mjsx with `ts-jest`
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true
      }
    ],
    '^.+\\.js$': 'babel-jest'
  },
  testPathIgnorePatterns: ['.*dist/', '.*node_modules/']
};

export default jestConfig;
