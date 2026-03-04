import { resolvePackage } from "../index";

describe(resolvePackage, () => {
  describe("string version values", () => {
    it("resolves a caret version with known alias", () => {
      const result = resolvePackage("firebase", "^11.0.0");
      expect(result).toEqual(
        expect.objectContaining({
          identifier: "firebase",
          url: "https://github.com/firebase/firebase-ios-sdk.git",
          isLocal: false,
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "11.0.0",
          },
        })
      );
      // Products default to the alias default products
      expect(result.products).toEqual(["FirebaseCore"]);
    });

    it("resolves a tilde version", () => {
      const result = resolvePackage("alamofire", "~5.9.0");
      expect(result.requirement).toEqual({
        kind: "upToNextMinorVersion",
        minimumVersion: "5.9.0",
      });
      expect(result.url).toBe(
        "https://github.com/Alamofire/Alamofire.git"
      );
    });

    it("resolves an exact version", () => {
      const result = resolvePackage("snapkit", "5.7.1");
      expect(result.requirement).toEqual({
        kind: "exact",
        version: "5.7.1",
      });
    });

    it('resolves "latest"', () => {
      const result = resolvePackage("alamofire", "latest");
      expect(result.requirement).toEqual({ kind: "latest" });
    });

    it("resolves a branch name", () => {
      const result = resolvePackage("alamofire", "develop");
      expect(result.requirement).toEqual({
        kind: "branch",
        branch: "develop",
      });
    });

    it("resolves a commit hash", () => {
      const result = resolvePackage("alamofire", "commit:abc123");
      expect(result.requirement).toEqual({
        kind: "revision",
        revision: "abc123",
      });
    });

    it("resolves a file: path as local package", () => {
      const result = resolvePackage("my-lib", "file:../my-lib");
      expect(result.isLocal).toBe(true);
      expect(result.path).toBe("../my-lib");
      expect(result.products).toEqual(["my-lib"]);
    });

    it("resolves relative path shorthand (../)", () => {
      const result = resolvePackage("LocalSPM", "../spm/local-pkg");
      expect(result.isLocal).toBe(true);
      expect(result.path).toBe("../spm/local-pkg");
      expect(result.products).toEqual(["LocalSPM"]);
    });

    it("resolves relative path shorthand (./)", () => {
      const result = resolvePackage("MyPackage", "./packages/my-pkg");
      expect(result.isLocal).toBe(true);
      expect(result.path).toBe("./packages/my-pkg");
      expect(result.products).toEqual(["MyPackage"]);
    });

    it("resolves absolute path shorthand", () => {
      const result = resolvePackage("AbsPackage", "/Users/me/packages/abs-pkg");
      expect(result.isLocal).toBe(true);
      expect(result.path).toBe("/Users/me/packages/abs-pkg");
      expect(result.products).toEqual(["AbsPackage"]);
    });
  });

  describe("full URL identifiers", () => {
    it("resolves full HTTPS URL as identifier", () => {
      const result = resolvePackage(
        "https://github.com/Alamofire/Alamofire.git",
        "^5.9.0"
      );
      expect(result.url).toBe(
        "https://github.com/Alamofire/Alamofire.git"
      );
      expect(result.products).toEqual(["Alamofire"]);
    });

    it("resolves URL without .git suffix", () => {
      const result = resolvePackage(
        "https://github.com/SnapKit/SnapKit",
        "^5.7.0"
      );
      expect(result.url).toBe(
        "https://github.com/SnapKit/SnapKit.git"
      );
    });
  });

  describe("GitHub shorthand identifiers", () => {
    it("resolves owner/repo format", () => {
      const result = resolvePackage("apple/swift-algorithms", "^1.2.0");
      expect(result.url).toBe(
        "https://github.com/apple/swift-algorithms.git"
      );
      expect(result.products).toEqual(["swift-algorithms"]);
    });
  });

  describe("config object values", () => {
    it("resolves config with explicit products", () => {
      const result = resolvePackage("firebase", {
        version: "^11.0.0",
        products: ["FirebaseAuth", "FirebaseFirestore"],
      });
      expect(result.products).toEqual([
        "FirebaseAuth",
        "FirebaseFirestore",
      ]);
    });

    it("resolves config with explicit URL", () => {
      const result = resolvePackage("my-pkg", {
        version: "^1.0.0",
        url: "https://github.com/me/my-package.git",
      });
      expect(result.url).toBe(
        "https://github.com/me/my-package.git"
      );
    });

    it("resolves config with path (local package)", () => {
      const result = resolvePackage("my-local", {
        path: "../my-local-package",
      });
      expect(result.isLocal).toBe(true);
      expect(result.path).toBe("../my-local-package");
    });

    it("resolves config with targets", () => {
      const result = resolvePackage("firebase", {
        version: "^11.0.0",
        products: ["FirebaseAuth"],
        targets: ["MyApp", "MyWidget"],
      });
      expect(result.targets).toEqual(["MyApp", "MyWidget"]);
    });

    it("preserves the config object", () => {
      const config = {
        version: "^11.0.0",
        products: ["FirebaseAuth"],
        binary: true,
      };
      const result = resolvePackage("firebase", config);
      expect(result.config).toEqual(config);
    });
  });

  describe("custom aliases", () => {
    it("uses custom alias over built-in", () => {
      const result = resolvePackage("firebase", "^11.0.0", {
        firebase: "https://my-mirror.com/firebase.git",
      });
      expect(result.url).toBe("https://my-mirror.com/firebase.git");
    });

    it("uses custom alias for unknown packages", () => {
      const result = resolvePackage("my-special-pkg", "^1.0.0", {
        "my-special-pkg": "https://github.com/me/special.git",
      });
      expect(result.url).toBe("https://github.com/me/special.git");
    });
  });

  describe("error cases", () => {
    it("throws for unresolvable package with no URL", () => {
      expect(() =>
        resolvePackage("completely-unknown-xyz", "^1.0.0")
      ).toThrow(/Could not resolve package URL/);
    });
  });
});
