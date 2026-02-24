import { validatePluginConfig, ValidationError } from "../validation";

describe(validatePluginConfig, () => {
  describe("valid configurations", () => {
    it("accepts minimal valid config with one dependency", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            firebase: "^11.0.0",
          },
        })
      ).not.toThrow();
    });

    it("accepts config with multiple version formats", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            firebase: "^11.0.0",
            alamofire: "~5.9.0",
            snapkit: "5.7.1",
            rxswift: "latest",
            "some-branch": "develop",
            "some-commit": "commit:abc123",
            "local-pkg": "file:../local",
          },
        })
      ).not.toThrow();
    });

    it("accepts config with package config objects", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            firebase: {
              version: "^11.0.0",
              url: "https://github.com/firebase/firebase-ios-sdk.git",
              products: ["FirebaseAuth", "FirebaseFirestore"],
            },
          },
        })
      ).not.toThrow();
    });

    it("accepts config with platforms", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            firebase: {
              version: "^11.0.0",
              platforms: {
                ios: "16.0",
                tvos: "16.0",
                watchos: "9.0",
                macos: "13.0",
                visionos: "1.0",
              },
            },
          },
        })
      ).not.toThrow();
    });

    it("accepts config with all dependency sections", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { firebase: "^11.0.0" },
          devDependencies: { "swift-testing": "latest" },
          optionalDependencies: { "optional-lib": "^1.0.0" },
        })
      ).not.toThrow();
    });

    it("accepts config with only devDependencies", () => {
      expect(() =>
        validatePluginConfig({
          devDependencies: { "swift-testing": "latest" },
        })
      ).not.toThrow();
    });

    it("accepts config with only optionalDependencies", () => {
      expect(() =>
        validatePluginConfig({
          optionalDependencies: { "optional-lib": "^1.0.0" },
        })
      ).not.toThrow();
    });

    it("accepts config with overrides", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { firebase: "^11.0.0" },
          overrides: {
            "grpc-swift": "^1.21.0",
          },
        })
      ).not.toThrow();
    });

    it("accepts config with aliases", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { "my-pkg": "^1.0.0" },
          aliases: {
            "my-pkg": "https://github.com/me/my-package.git",
          },
        })
      ).not.toThrow();
    });

    it("accepts config with global config", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { firebase: "^11.0.0" },
          config: {
            platforms: { ios: "16.0" },
            swift: "5.9",
            saveExact: false,
            savePrefix: "^",
          },
        })
      ).not.toThrow();
    });

    it("accepts config with path-based package", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            "local-lib": {
              path: "../my-swift-package",
            },
          },
        })
      ).not.toThrow();
    });

    it("accepts config with targets", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            firebase: {
              version: "^11.0.0",
              targets: ["MyApp", "MyWidget"],
            },
          },
        })
      ).not.toThrow();
    });

    it("accepts config with boolean fields", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            firebase: {
              version: "^11.0.0",
              binary: true,
              optional: false,
            },
          },
        })
      ).not.toThrow();
    });
  });

  describe("invalid top-level inputs", () => {
    it("rejects non-object (string)", () => {
      expect(() => validatePluginConfig("not an object")).toThrow(
        ValidationError
      );
    });

    it("rejects non-object (number)", () => {
      expect(() => validatePluginConfig(42)).toThrow(ValidationError);
    });

    it("rejects null", () => {
      expect(() => validatePluginConfig(null)).toThrow(ValidationError);
    });

    it("rejects undefined", () => {
      expect(() => validatePluginConfig(undefined)).toThrow(
        ValidationError
      );
    });

    it("rejects array", () => {
      expect(() => validatePluginConfig([])).toThrow(ValidationError);
    });

    it("rejects empty object (no dependency sections)", () => {
      expect(() => validatePluginConfig({})).toThrow(
        /at least one of/
      );
    });
  });

  describe("invalid version strings", () => {
    it("rejects invalid characters in version", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { pkg: "invalid!@#" },
        })
      ).toThrow(/Invalid version string/);
    });

    it("rejects empty version string", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { pkg: "" },
        })
      ).toThrow(/Invalid version string/);
    });
  });

  describe("invalid package configs", () => {
    it("rejects package config without version or path", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: { url: "https://github.com/foo/bar.git" },
          },
        })
      ).toThrow(/must have a 'version' or 'path'/);
    });

    it("rejects invalid URL format", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              url: "not-a-valid-url",
            },
          },
        })
      ).toThrow(/Invalid package URL/);
    });

    it("accepts git@ SSH URLs", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              url: "git@github.com:owner/repo.git",
            },
          },
        })
      ).not.toThrow();
    });

    it("rejects empty products array", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: { version: "^1.0.0", products: [] },
          },
        })
      ).toThrow(/'products' array must not be empty/);
    });

    it("rejects non-string products", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: { version: "^1.0.0", products: [42 as any] },
          },
        })
      ).toThrow(/Each product must be a string/);
    });

    it("rejects non-boolean binary field", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: { version: "^1.0.0", binary: "yes" as any },
          },
        })
      ).toThrow(/'binary' must be a boolean/);
    });

    it("rejects non-boolean optional field", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: { version: "^1.0.0", optional: "maybe" as any },
          },
        })
      ).toThrow(/'optional' must be a boolean/);
    });

    it("rejects non-array targets", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: { version: "^1.0.0", targets: "MyApp" as any },
          },
        })
      ).toThrow(/'targets' must be an array/);
    });
  });

  describe("invalid platforms", () => {
    it("rejects invalid platform name", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              platforms: { android: "14" } as any,
            },
          },
        })
      ).toThrow(/Invalid platform: "android"/);
    });

    it("rejects invalid platform version format", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              platforms: { ios: "sixteen" },
            },
          },
        })
      ).toThrow(/Invalid platform version format/);
    });

    it("rejects platform version with extra dots", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              platforms: { ios: "16.0.0.0" },
            },
          },
        })
      ).toThrow(/Invalid platform version format/);
    });

    it("accepts all valid platform names", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              platforms: {
                ios: "16.0",
                tvos: "16.0",
                watchos: "9.0",
                macos: "13.0",
                visionos: "1.0",
                catalyst: "16.0",
              },
            },
          },
        })
      ).not.toThrow();
    });

    it("accepts various valid version formats", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: {
            pkg: {
              version: "^1.0.0",
              platforms: {
                ios: "16",
                macos: "13.0",
                watchos: "9.0.1",
              },
            },
          },
        })
      ).not.toThrow();
    });
  });

  describe("invalid global config", () => {
    it("rejects non-string swift version", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { pkg: "^1.0.0" },
          config: { swift: 5.9 as any },
        })
      ).toThrow(/'swift' must be a string/);
    });

    it("rejects non-boolean saveExact", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { pkg: "^1.0.0" },
          config: { saveExact: "yes" as any },
        })
      ).toThrow(/'saveExact' must be a boolean/);
    });

    it("rejects invalid savePrefix", () => {
      expect(() =>
        validatePluginConfig({
          dependencies: { pkg: "^1.0.0" },
          config: { savePrefix: ">" as any },
        })
      ).toThrow(/'savePrefix' must be/);
    });
  });

  describe("ValidationError properties", () => {
    it("includes path in error", () => {
      try {
        validatePluginConfig({
          dependencies: { pkg: "invalid!@#" },
        });
        fail("Expected error to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).path).toBe("dependencies.pkg");
      }
    });

    it("has correct name", () => {
      const err = new ValidationError("test");
      expect(err.name).toBe("ValidationError");
    });

    it("includes path in message when present", () => {
      const err = new ValidationError("bad value", "some.path");
      expect(err.message).toBe("some.path: bad value");
    });

    it("excludes path prefix when no path", () => {
      const err = new ValidationError("bad value");
      expect(err.message).toBe("bad value");
    });
  });
});
