/**
 * Tests for version string parsing
 */

import {
  parseVersionString,
  requirementToString,
  isValidVersionString,
  normalizeVersionString,
} from "../version";

describe("parseVersionString", () => {
  it("should parse caret versions", () => {
    const result = parseVersionString("^1.2.3");
    expect(result.requirement.kind).toBe("upToNextMajorVersion");
    expect(result.requirement).toHaveProperty("minimumVersion", "1.2.3");
    expect(result.isLocal).toBe(false);
  });

  it("should parse tilde versions", () => {
    const result = parseVersionString("~1.2.3");
    expect(result.requirement.kind).toBe("upToNextMinorVersion");
    expect(result.requirement).toHaveProperty("minimumVersion", "1.2.3");
    expect(result.isLocal).toBe(false);
  });

  it("should parse exact versions", () => {
    const result = parseVersionString("1.2.3");
    expect(result.requirement.kind).toBe("exact");
    expect(result.requirement).toHaveProperty("version", "1.2.3");
    expect(result.isLocal).toBe(false);
  });

  it("should parse version ranges", () => {
    const result = parseVersionString(">=1.0.0 <2.0.0");
    expect(result.requirement.kind).toBe("range");
    expect(result.requirement).toHaveProperty("minimumVersion");
    expect(result.requirement).toHaveProperty("maximumVersion");
    expect(result.isLocal).toBe(false);
  });

  it("should parse latest", () => {
    const result = parseVersionString("latest");
    expect(result.requirement.kind).toBe("latest");
    expect(result.isLocal).toBe(false);
  });

  it("should parse branch names", () => {
    const result = parseVersionString("develop");
    expect(result.requirement.kind).toBe("branch");
    expect(result.requirement).toHaveProperty("branch", "develop");
    expect(result.isLocal).toBe(false);
  });

  it("should parse commit hashes", () => {
    const result = parseVersionString("commit:abc123");
    expect(result.requirement.kind).toBe("revision");
    expect(result.requirement).toHaveProperty("revision", "abc123");
    expect(result.isLocal).toBe(false);
  });

  it("should parse local file paths", () => {
    const result = parseVersionString("file:../local-package");
    expect(result.requirement.kind).toBe("latest");
    expect(result.isLocal).toBe(true);
    expect(result.localPath).toBe("../local-package");
  });

  it("should throw on invalid version strings", () => {
    expect(() => parseVersionString("")).toThrow();
    expect(() => parseVersionString("invalid!@#$%")).toThrow();
  });
});

describe("requirementToString", () => {
  it("should convert upToNextMajor to caret", () => {
    const req = { kind: "upToNextMajorVersion" as const, minimumVersion: "1.2.3" };
    expect(requirementToString(req)).toBe("^1.2.3");
  });

  it("should convert upToNextMinor to tilde", () => {
    const req = { kind: "upToNextMinorVersion" as const, minimumVersion: "1.2.3" };
    expect(requirementToString(req)).toBe("~1.2.3");
  });

  it("should convert exact to version string", () => {
    const req = { kind: "exact" as const, version: "1.2.3" };
    expect(requirementToString(req)).toBe("1.2.3");
  });

  it("should convert latest", () => {
    const req = { kind: "latest" as const };
    expect(requirementToString(req)).toBe("latest");
  });
});

describe("isValidVersionString", () => {
  it("should validate correct version strings", () => {
    expect(isValidVersionString("^1.2.3")).toBe(true);
    expect(isValidVersionString("~1.2.3")).toBe(true);
    expect(isValidVersionString("1.2.3")).toBe(true);
    expect(isValidVersionString("latest")).toBe(true);
    expect(isValidVersionString("develop")).toBe(true);
    expect(isValidVersionString("commit:abc123")).toBe(true);
    expect(isValidVersionString("file:../path")).toBe(true);
  });

  it("should reject invalid version strings", () => {
    expect(isValidVersionString("")).toBe(false);
    expect(isValidVersionString("invalid!@#$%")).toBe(false);
  });
});

describe("normalizeVersionString", () => {
  it("should normalize version strings to consistent format", () => {
    expect(normalizeVersionString("^1.2.3")).toBe("^1.2.3");
    expect(normalizeVersionString("~1.2.3")).toBe("~1.2.3");
    expect(normalizeVersionString("1.2.3")).toBe("1.2.3");
  });
});
