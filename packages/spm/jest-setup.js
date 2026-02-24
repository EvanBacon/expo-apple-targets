/**
 * Patch Module._resolveFilename to handle `node:*` protocol imports.
 * Jest 26 doesn't understand the `node:` prefix for built-in modules,
 * which @bacons/xcode uses in its compiled output.
 */
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("node:")) {
    request = request.slice(5);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
