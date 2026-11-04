import fs from "fs";
import os from "os";
import path from "path";

// Real files, real glob, and the real @expo/require-utils loader. Only the step
// that writes to the Xcode project is stubbed, so each test can read back which
// config reached it.
const mockWithWidget = jest.fn((config: unknown, _props: unknown) => config);
jest.mock("../with-widget", () => ({
  __esModule: true,
  default: mockWithWidget,
}));
jest.mock("../with-bacons-xcode", () => ({
  withXcodeProjectBetaBaseMod: jest.fn(),
}));
jest.mock("../with-pod-target-extension", () => ({
  ...jest.requireActual("../with-pod-target-extension"),
  withPodTargetExtension: jest.fn(),
}));

const mockWarnOnce = jest.fn();
jest.mock("../util", () => ({
  ...jest.requireActual("../util"),
  warnOnce: mockWarnOnce,
}));

const withTargetsDir = require("../config-plugin");

type LoadedTarget = {
  type: string;
  name?: string;
  directory: string;
  configPath: string;
};

let projectRoot: string;

function writeConfig(target: string, filename: string, contents: string) {
  const dir = path.join(projectRoot, "targets", target);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), contents);
}

function loadTargets(): LoadedTarget[] {
  withTargetsDir(
    {
      name: "host",
      slug: "host",
      ios: { bundleIdentifier: "com.example.host", appleTeamId: "XXXXXXXXXX" },
      _internal: { projectRoot },
    },
    {},
  );
  return mockWithWidget.mock.calls.map(([, props]) => props as LoadedTarget);
}

beforeEach(() => {
  mockWithWidget.mockClear();
  mockWarnOnce.mockClear();
  // realpath: macOS tmpdir is a symlink, and glob returns the resolved path.
  projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "apple-targets-config-")),
  );
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe("expo-target.config formats", () => {
  const formats: [filename: string, contents: string][] = [
    [
      "expo-target.config.ts",
      `const config: { type: string; name: string } = { type: "widget", name: "Loaded" };
export default config;`,
    ],
    [
      "expo-target.config.mts",
      `const config: { type: string; name: string } = { type: "widget", name: "Loaded" };
export default config;`,
    ],
    [
      "expo-target.config.cts",
      `const config: { type: string; name: string } = { type: "widget", name: "Loaded" };
export = config;`,
    ],
    [
      "expo-target.config.mjs",
      `export default { type: "widget", name: "Loaded" };`,
    ],
    [
      "expo-target.config.cjs",
      `module.exports = { type: "widget", name: "Loaded" };`,
    ],
    [
      "expo-target.config.js",
      `module.exports = { type: "widget", name: "Loaded" };`,
    ],
    ["expo-target.config.json", `{ "type": "widget", "name": "Loaded" }`],
  ];

  it.each(formats)("loads %s", (filename, contents) => {
    writeConfig("a", filename, contents);

    const [target, ...rest] = loadTargets();

    expect(rest).toEqual([]);
    expect(target).toMatchObject({
      type: "widget",
      name: "Loaded",
      directory: path.join("targets", "a"),
      configPath: path.join(projectRoot, "targets", "a", filename),
    });
  });

  it("calls a function exported as an ESM default with the Expo config", () => {
    writeConfig(
      "a",
      "expo-target.config.ts",
      `export default (config: { slug: string }) => ({ type: "widget", name: config.slug });`,
    );

    expect(loadTargets()[0]).toMatchObject({ type: "widget", name: "host" });
  });

  it("reads named exports when there is no default export", () => {
    writeConfig(
      "a",
      "expo-target.config.mjs",
      `export const type = "widget";
export const name = "Named";`,
    );

    expect(loadTargets()[0]).toMatchObject({ type: "widget", name: "Named" });
  });

  it.each([
    ["null", `export default null;`, "to be an object"],
    ["a string", `export default "widget";`, "to be an object"],
    [
      "a function returning null",
      `export default () => null;`,
      "function to return an object",
    ],
    ["an object with no type", `export default {};`, "'type' property"],
  ])("rejects a config that exports %s", (_label, contents, message) => {
    writeConfig("a", "expo-target.config.ts", contents);

    expect(loadTargets).toThrow(message);
    expect(mockWithWidget).not.toHaveBeenCalled();
  });
});

describe("multiple configs in one target directory", () => {
  it("registers the target once using the highest-priority file, and warns", () => {
    writeConfig(
      "a",
      "expo-target.config.json",
      `{ "type": "widget", "name": "FromJson" }`,
    );
    writeConfig(
      "a",
      "expo-target.config.js",
      `module.exports = { type: "widget", name: "FromJs" };`,
    );
    writeConfig(
      "a",
      "expo-target.config.ts",
      `export default { type: "widget", name: "FromTs" };`,
    );

    const targets = loadTargets();

    expect(targets.map((target) => target.name)).toEqual(["FromTs"]);
    const warning = mockWarnOnce.mock.calls
      .map(([message]) => message as string)
      .find((message) => message.includes("Multiple"));
    expect(warning).toContain(path.join("targets", "a"));
    expect(warning).toContain("expo-target.config.js, expo-target.config.json");
  });

  it("follows ts > mts > cts > mjs > js > cjs > json", () => {
    const priority = ["ts", "mts", "cts", "mjs", "js", "cjs", "json"];
    // Directory 0 holds every format, 1 every format but the first, and so on,
    // so each format wins exactly one directory.
    priority.forEach((_winner, index) => {
      for (const ext of priority.slice(index)) {
        writeConfig(
          String(index),
          `expo-target.config.${ext}`,
          ext === "json"
            ? `{ "type": "widget", "name": "json" }`
            : ext === "cjs" || ext === "js" || ext === "cts"
            ? `module.exports = { type: "widget", name: "${ext}" };`
            : `export default { type: "widget", name: "${ext}" };`,
        );
      }
    });

    const names = loadTargets()
      .sort((a, b) => a.directory.localeCompare(b.directory))
      .map((target) => target.name);

    expect(names).toEqual(priority);
  });

  it("does not warn when each target directory has one config", () => {
    writeConfig(
      "a",
      "expo-target.config.ts",
      `export default { type: "widget" };`,
    );
    writeConfig("b", "expo-target.config.json", `{ "type": "widget" }`);

    expect(loadTargets()).toHaveLength(2);
    expect(mockWarnOnce).not.toHaveBeenCalledWith(
      expect.stringContaining("Multiple"),
    );
  });
});
