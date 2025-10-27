/**
 * Tests for configuration validation
 */

import { validatePluginConfig, ValidationError } from "../validation";

describe("validatePluginConfig", () => {
  it("should accept valid simple configuration", () => {
    const config = {
      dependencies: {
        firebase: "^10.0.0",
        alamofire: "~5.6.0",
      },
    };

    expect(() => validatePluginConfig(config)).not.toThrow();
  });

  it("should accept valid complex configuration", () => {
    const config = {
      dependencies: {
        firebase: {
          version: "^10.0.0",
          products: ["Analytics", "Crashlytics"],
          platforms: {
            ios: "14.0",
          },
        },
      },
      devDependencies: {
        swiftlint: "^0.50.0",
      },
      config: {
        platforms: {
          ios: "14.0",
        },
        savePrefix: "^" as const,
      },
    };

    expect(() => validatePluginConfig(config)).not.toThrow();
  });

  it("should reject non-object configuration", () => {
    expect(() => validatePluginConfig("not an object")).toThrow(ValidationError);
    expect(() => validatePluginConfig(null)).toThrow(ValidationError);
    expect(() => validatePluginConfig(undefined)).toThrow(ValidationError);
  });

  it("should reject empty configuration", () => {
    expect(() => validatePluginConfig({})).toThrow(ValidationError);
  });

  it("should reject invalid version strings", () => {
    const config = {
      dependencies: {
        firebase: "invalid!@#",
      },
    };

    expect(() => validatePluginConfig(config)).toThrow(ValidationError);
  });

  it("should reject package config without version", () => {
    const config = {
      dependencies: {
        firebase: {
          products: ["Analytics"],
        },
      },
    };

    expect(() => validatePluginConfig(config)).toThrow(ValidationError);
  });

  it("should reject invalid URL format", () => {
    const config = {
      dependencies: {
        firebase: {
          version: "^10.0.0",
          url: "not-a-url",
        },
      },
    };

    expect(() => validatePluginConfig(config)).toThrow(ValidationError);
  });

  it("should reject empty products array", () => {
    const config = {
      dependencies: {
        firebase: {
          version: "^10.0.0",
          products: [],
        },
      },
    };

    expect(() => validatePluginConfig(config)).toThrow(ValidationError);
  });

  it("should reject invalid platform names", () => {
    const config = {
      dependencies: {
        firebase: {
          version: "^10.0.0",
          platforms: {
            android: "14.0", // Invalid platform
          },
        },
      },
    };

    expect(() => validatePluginConfig(config)).toThrow(ValidationError);
  });

  it("should reject invalid platform version format", () => {
    const config = {
      dependencies: {
        firebase: {
          version: "^10.0.0",
          platforms: {
            ios: "invalid",
          },
        },
      },
    };

    expect(() => validatePluginConfig(config)).toThrow(ValidationError);
  });

  it("should accept valid platform versions", () => {
    const config = {
      dependencies: {
        firebase: {
          version: "^10.0.0",
          platforms: {
            ios: "14.0",
            tvos: "14.0",
            watchos: "7.0",
            macos: "11.0",
            visionos: "1.0",
          },
        },
      },
    };

    expect(() => validatePluginConfig(config)).not.toThrow();
  });
});
