import type { ExpoConfig } from "expo/config";

jest.mock("glob", () => ({
  globSync: jest.fn(() => []),
}));

const mockWarnOnce = jest.fn();
jest.mock("../util", () => ({
  ...jest.requireActual("../util"),
  warnOnce: mockWarnOnce,
}));

const withTargetsDir = require("../config-plugin");

function createConfig(overrides?: Partial<ExpoConfig>): ExpoConfig {
  return {
    name: "test",
    slug: "test-app",
    _internal: { projectRoot: "/fake/project" },
    ...overrides,
  };
}

describe(withTargetsDir, () => {
  beforeEach(() => {
    mockWarnOnce.mockClear();
  });

  it("uses fallback bundleIdentifier when ios.bundleIdentifier is missing", () => {
    const config = withTargetsDir(createConfig(), {});

    expect(config.ios.bundleIdentifier).toBe("com.example.test-app");
    expect(mockWarnOnce).toHaveBeenCalledWith(
      expect.stringContaining("ios.bundleIdentifier"),
    );
  });

  it("uses fallback bundleIdentifier when ios object is undefined", () => {
    const config = withTargetsDir(createConfig({ ios: undefined }), {});

    expect(config.ios.bundleIdentifier).toBe("com.example.test-app");
    expect(mockWarnOnce).toHaveBeenCalledWith(
      expect.stringContaining("ios.bundleIdentifier"),
    );
  });

  it("uses fallback bundleIdentifier when ios.bundleIdentifier is empty string", () => {
    const config = withTargetsDir(
      createConfig({ ios: { bundleIdentifier: "" } }),
      {},
    );

    expect(config.ios.bundleIdentifier).toBe("com.example.test-app");
    expect(mockWarnOnce).toHaveBeenCalledWith(
      expect.stringContaining("ios.bundleIdentifier"),
    );
  });

  it("does not warn when ios.bundleIdentifier is provided", () => {
    const config = withTargetsDir(
      createConfig({ ios: { bundleIdentifier: "com.myapp.test" } }),
      {},
    );

    expect(config.ios.bundleIdentifier).toBe("com.myapp.test");
    expect(mockWarnOnce).not.toHaveBeenCalledWith(
      expect.stringContaining("ios.bundleIdentifier"),
    );
  });
});
