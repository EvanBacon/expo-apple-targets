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
};
