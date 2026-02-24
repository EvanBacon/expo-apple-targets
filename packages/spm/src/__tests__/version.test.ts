import {
  parseVersionString,
  requirementToString,
  isValidVersionString,
  normalizeVersionString,
} from "../version";

describe(parseVersionString, () => {
  describe("caret ranges", () => {
    it("parses ^1.2.3 as upToNextMajorVersion", () => {
      const result = parseVersionString("^1.2.3");
      expect(result.requirement).toEqual({
        kind: "upToNextMajorVersion",
        minimumVersion: "1.2.3",
      });
      expect(result.isLocal).toBe(false);
    });

    it("parses ^0.1.0 as upToNextMajorVersion", () => {
      const result = parseVersionString("^0.1.0");
      expect(result.requirement).toEqual({
        kind: "upToNextMajorVersion",
        minimumVersion: "0.1.0",
      });
    });

    it("parses ^11.0.0 (double-digit major)", () => {
      const result = parseVersionString("^11.0.0");
      expect(result.requirement).toEqual({
        kind: "upToNextMajorVersion",
        minimumVersion: "11.0.0",
      });
    });

    it("parses ^1.0 (short semver)", () => {
      const result = parseVersionString("^1.0");
      expect(result.requirement).toEqual({
        kind: "upToNextMajorVersion",
        minimumVersion: "1.0.0",
      });
    });

    it("parses ^5 (major only)", () => {
      const result = parseVersionString("^5");
      expect(result.requirement).toEqual({
        kind: "upToNextMajorVersion",
        minimumVersion: "5.0.0",
      });
    });

    it("throws on invalid caret version", () => {
      expect(() => parseVersionString("^not-a-version")).toThrow(
        "Invalid caret version"
      );
    });
  });

  describe("tilde ranges", () => {
    it("parses ~1.2.3 as upToNextMinorVersion", () => {
      const result = parseVersionString("~1.2.3");
      expect(result.requirement).toEqual({
        kind: "upToNextMinorVersion",
        minimumVersion: "1.2.3",
      });
      expect(result.isLocal).toBe(false);
    });

    it("parses ~5.9.0", () => {
      const result = parseVersionString("~5.9.0");
      expect(result.requirement).toEqual({
        kind: "upToNextMinorVersion",
        minimumVersion: "5.9.0",
      });
    });

    it("throws on invalid tilde version", () => {
      expect(() => parseVersionString("~not-a-version")).toThrow(
        "Invalid tilde version"
      );
    });
  });

  describe("exact versions", () => {
    it("parses 1.2.3 as exact", () => {
      const result = parseVersionString("1.2.3");
      expect(result.requirement).toEqual({
        kind: "exact",
        version: "1.2.3",
      });
    });

    it("parses 0.0.1 as exact", () => {
      const result = parseVersionString("0.0.1");
      expect(result.requirement).toEqual({
        kind: "exact",
        version: "0.0.1",
      });
    });

    it("parses 2.0 as exact (coerced)", () => {
      const result = parseVersionString("2.0");
      expect(result.requirement).toEqual({
        kind: "exact",
        version: "2.0.0",
      });
    });

    it("parses 3 as exact (coerced)", () => {
      const result = parseVersionString("3");
      expect(result.requirement).toEqual({
        kind: "exact",
        version: "3.0.0",
      });
    });
  });

  describe("ranges", () => {
    it("parses >=1.0.0 <2.0.0 as range", () => {
      const result = parseVersionString(">=1.0.0 <2.0.0");
      expect(result.requirement).toEqual({
        kind: "range",
        minimumVersion: "1.0.0",
        maximumVersion: "2.0.0",
      });
    });

    it("parses >=0.5.0 <1.0.0 as range", () => {
      const result = parseVersionString(">=0.5.0 <1.0.0");
      expect(result.requirement).toEqual({
        kind: "range",
        minimumVersion: "0.5.0",
        maximumVersion: "1.0.0",
      });
    });

    it("handles spaces around operators", () => {
      const result = parseVersionString(">= 1.0.0 < 2.0.0");
      expect(result.requirement).toEqual({
        kind: "range",
        minimumVersion: "1.0.0",
        maximumVersion: "2.0.0",
      });
    });
  });

  describe("latest / wildcard", () => {
    it('parses "latest" as latest', () => {
      const result = parseVersionString("latest");
      expect(result.requirement).toEqual({ kind: "latest" });
    });

    it('parses "*" as latest', () => {
      const result = parseVersionString("*");
      expect(result.requirement).toEqual({ kind: "latest" });
    });
  });

  describe("branch names", () => {
    it('parses "develop" as branch', () => {
      const result = parseVersionString("develop");
      expect(result.requirement).toEqual({
        kind: "branch",
        branch: "develop",
      });
    });

    it('parses "main" as branch', () => {
      const result = parseVersionString("main");
      expect(result.requirement).toEqual({
        kind: "branch",
        branch: "main",
      });
    });

    it('parses "feature/my-branch" as branch', () => {
      const result = parseVersionString("feature/my-branch");
      expect(result.requirement).toEqual({
        kind: "branch",
        branch: "feature/my-branch",
      });
    });

    it('parses "release-1.0" as branch', () => {
      const result = parseVersionString("release-1.0");
      expect(result.requirement).toEqual({
        kind: "branch",
        branch: "release-1.0",
      });
    });
  });

  describe("commit revisions", () => {
    it("parses commit:abc123 as revision", () => {
      const result = parseVersionString("commit:abc123");
      expect(result.requirement).toEqual({
        kind: "revision",
        revision: "abc123",
      });
    });

    it("parses long commit hash", () => {
      const hash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
      const result = parseVersionString(`commit:${hash}`);
      expect(result.requirement).toEqual({
        kind: "revision",
        revision: hash,
      });
    });

    it("throws on empty commit hash", () => {
      expect(() => parseVersionString("commit:")).toThrow(
        '"commit:" must be followed by a commit hash'
      );
    });
  });

  describe("local file references", () => {
    it("parses file:../local-package", () => {
      const result = parseVersionString("file:../local-package");
      expect(result.isLocal).toBe(true);
      expect(result.localPath).toBe("../local-package");
    });

    it("parses file:./relative/path", () => {
      const result = parseVersionString("file:./relative/path");
      expect(result.isLocal).toBe(true);
      expect(result.localPath).toBe("./relative/path");
    });

    it("parses file:/absolute/path", () => {
      const result = parseVersionString("file:/absolute/path");
      expect(result.isLocal).toBe(true);
      expect(result.localPath).toBe("/absolute/path");
    });

    it("throws on empty file path", () => {
      expect(() => parseVersionString("file:")).toThrow(
        '"file:" must be followed by a path'
      );
    });
  });

  describe("error cases", () => {
    it("throws on empty string", () => {
      expect(() => parseVersionString("")).toThrow(
        "Version string cannot be empty"
      );
    });

    it("throws on whitespace-only string", () => {
      expect(() => parseVersionString("   ")).toThrow(
        "Version string cannot be empty"
      );
    });

    it("throws on invalid characters", () => {
      expect(() => parseVersionString("invalid!@#")).toThrow(
        "Invalid version string"
      );
    });

    it("throws on just symbols", () => {
      expect(() => parseVersionString("!@#$%")).toThrow(
        "Invalid version string"
      );
    });
  });

  it("preserves original input", () => {
    const result = parseVersionString("^1.2.3");
    expect(result.original).toBe("^1.2.3");
  });

  it("trims whitespace from input", () => {
    const result = parseVersionString("  ^1.2.3  ");
    expect(result.requirement).toEqual({
      kind: "upToNextMajorVersion",
      minimumVersion: "1.2.3",
    });
  });
});

describe(requirementToString, () => {
  it("converts upToNextMajorVersion", () => {
    expect(
      requirementToString({
        kind: "upToNextMajorVersion",
        minimumVersion: "1.2.3",
      })
    ).toBe("^1.2.3");
  });

  it("converts upToNextMinorVersion", () => {
    expect(
      requirementToString({
        kind: "upToNextMinorVersion",
        minimumVersion: "1.2.3",
      })
    ).toBe("~1.2.3");
  });

  it("converts exact", () => {
    expect(
      requirementToString({ kind: "exact", version: "1.2.3" })
    ).toBe("1.2.3");
  });

  it("converts range", () => {
    expect(
      requirementToString({
        kind: "range",
        minimumVersion: "1.0.0",
        maximumVersion: "2.0.0",
      })
    ).toBe(">=1.0.0 <2.0.0");
  });

  it("converts branch", () => {
    expect(
      requirementToString({ kind: "branch", branch: "develop" })
    ).toBe("develop");
  });

  it("converts revision", () => {
    expect(
      requirementToString({ kind: "revision", revision: "abc123" })
    ).toBe("commit:abc123");
  });

  it("converts latest", () => {
    expect(requirementToString({ kind: "latest" })).toBe("latest");
  });
});

describe(isValidVersionString, () => {
  it.each([
    "^1.2.3",
    "~1.2.3",
    "1.2.3",
    ">=1.0.0 <2.0.0",
    "latest",
    "*",
    "develop",
    "main",
    "commit:abc123",
    "file:../local",
    "^0.1.0",
    "~5.9.0",
    "0.0.1",
    "feature/branch",
  ])("returns true for valid input: %s", (input) => {
    expect(isValidVersionString(input)).toBe(true);
  });

  it.each(["", "   ", "!@#$", "invalid!version"])(
    "returns false for invalid input: %s",
    (input) => {
      expect(isValidVersionString(input)).toBe(false);
    }
  );
});

describe(normalizeVersionString, () => {
  it("normalizes ^1.2 to ^1.2.0", () => {
    expect(normalizeVersionString("^1.2")).toBe("^1.2.0");
  });

  it("normalizes ~5.9 to ~5.9.0", () => {
    expect(normalizeVersionString("~5.9")).toBe("~5.9.0");
  });

  it("normalizes 2.0 to 2.0.0", () => {
    expect(normalizeVersionString("2.0")).toBe("2.0.0");
  });

  it("normalizes file:../path to file:../path", () => {
    expect(normalizeVersionString("file:../path")).toBe("file:../path");
  });

  it("normalizes latest to latest", () => {
    expect(normalizeVersionString("latest")).toBe("latest");
  });

  it("normalizes * to latest", () => {
    expect(normalizeVersionString("*")).toBe("latest");
  });

  it("is idempotent for already-normalized strings", () => {
    const inputs = [
      "^1.2.3",
      "~1.2.3",
      "1.2.3",
      ">=1.0.0 <2.0.0",
      "latest",
      "develop",
      "commit:abc123",
    ];
    for (const input of inputs) {
      expect(normalizeVersionString(input)).toBe(
        normalizeVersionString(normalizeVersionString(input))
      );
    }
  });
});
