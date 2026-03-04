const path = require("path");

const shimDir = path.resolve(__dirname, "__shims__");

module.exports = {
  testEnvironment: "node",
  testRegex: "/__tests__/.*(test|spec)\\.[jt]sx?$",
  clearMocks: true,
  rootDir: path.resolve(__dirname),
  displayName: require("./package").name,
  roots: ["src"],
  // Jest 26 doesn't support `node:*` protocol imports used by @bacons/xcode.
  // Map them to shim files that re-export the bare module.
  moduleNameMapper: {
    "^node:path$": path.join(shimDir, "node_path.js"),
    "^node:fs$": path.join(shimDir, "node_fs.js"),
    "^node:fs/promises$": path.join(shimDir, "node_fs_promises.js"),
    "^node:os$": path.join(shimDir, "node_os.js"),
    "^node:url$": path.join(shimDir, "node_url.js"),
    "^node:util$": path.join(shimDir, "node_util.js"),
    "^node:crypto$": path.join(shimDir, "node_crypto.js"),
    "^node:stream$": path.join(shimDir, "node_stream.js"),
    "^node:events$": path.join(shimDir, "node_events.js"),
    "^node:buffer$": path.join(shimDir, "node_buffer.js"),
    "^node:assert$": path.join(shimDir, "node_assert.js"),
  },
};
