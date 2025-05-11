/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  transformIgnorePatterns: ["/node_modules/(?!nanoid).+\\.js$"],
  moduleNameMapper: {
    "^nanoid$": "<rootDir>/src/test/mocks/nanoidMock.ts",
  },
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/layer/",
    "/test/",
    "src/schemas/*",
    "src/utils/*",
  ],
};
