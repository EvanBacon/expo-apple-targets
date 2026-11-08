const path = require("path");

module.exports = {
  testEnvironment: "node",
  testRegex: "/__tests__/.*(test|spec)\\.[jt]sx?$",
  testTimeout: 600000, // 10 minutes
  clearMocks: true,
  rootDir: path.resolve(__dirname),
  displayName: "e2e",
  roots: ["."],
  globalSetup: "./setup.ts",
  // globalSetup is loaded through Jest's transform pipeline. Without this,
  // babel-jest parses setup.ts as JS and dies on the type annotations.
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        isolatedModules: true,
        tsconfig: {
          esModuleInterop: true,
          module: "commonjs",
          target: "es2019",
          skipLibCheck: true,
        },
      },
    ],
  },
};
