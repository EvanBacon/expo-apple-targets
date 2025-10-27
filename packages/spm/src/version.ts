/**
 * Version string parsing and resolution for Swift Package Manager
 * Converts npm-style version strings to SPM requirement objects
 */

import * as semver from "semver";
import { SwiftPackageRequirement, ParsedVersion } from "./types";

/**
 * Parse an npm-style version string into a Swift Package Manager requirement
 *
 * Supported formats:
 * - ^1.2.3 → upToNextMajor (>=1.2.3 <2.0.0)
 * - ~1.2.3 → upToNextMinor (>=1.2.3 <1.3.0)
 * - 1.2.3 → exact version
 * - >=1.0.0 <2.0.0 → range
 * - latest → latest version
 * - branch-name → git branch
 * - commit:abc123 → git revision
 * - file:../path → local package
 *
 * @param versionString The version string to parse
 * @returns Parsed version information
 */
export function parseVersionString(versionString: string): ParsedVersion {
  const trimmed = versionString.trim();

  // Handle file: protocol (local packages)
  if (trimmed.startsWith("file:")) {
    const localPath = trimmed.substring(5);
    return {
      original: versionString,
      requirement: { kind: "latest" }, // Local packages don't need version requirements
      isLocal: true,
      localPath,
    };
  }

  // Handle commit: protocol (specific git revision)
  if (trimmed.startsWith("commit:")) {
    const revision = trimmed.substring(7);
    return {
      original: versionString,
      requirement: { kind: "revision", revision },
      isLocal: false,
    };
  }

  // Handle 'latest' keyword
  if (trimmed === "latest") {
    return {
      original: versionString,
      requirement: { kind: "latest" },
      isLocal: false,
    };
  }

  // Handle caret range (^1.2.3)
  if (trimmed.startsWith("^")) {
    const version = trimmed.substring(1);
    if (!semver.valid(version)) {
      throw new Error(`Invalid version string: ${versionString}`);
    }
    return {
      original: versionString,
      requirement: {
        kind: "upToNextMajorVersion",
        minimumVersion: version,
      },
      isLocal: false,
    };
  }

  // Handle tilde range (~1.2.3)
  if (trimmed.startsWith("~")) {
    const version = trimmed.substring(1);
    if (!semver.valid(version)) {
      throw new Error(`Invalid version string: ${versionString}`);
    }
    return {
      original: versionString,
      requirement: {
        kind: "upToNextMinorVersion",
        minimumVersion: version,
      },
      isLocal: false,
    };
  }

  // Handle version range (>=1.0.0 <2.0.0)
  if (trimmed.includes(" ") && (trimmed.includes(">=") || trimmed.includes("<"))) {
    const range = new semver.Range(trimmed);
    const set = range.set[0]; // Get first range set

    if (set && set.length >= 2) {
      // Extract min and max versions from the range
      let minimumVersion = "0.0.0";
      let maximumVersion = "999.999.999";

      for (const comparator of set) {
        if (comparator.operator === ">=" || comparator.operator === ">") {
          minimumVersion = comparator.semver.version;
        } else if (comparator.operator === "<" || comparator.operator === "<=") {
          maximumVersion = comparator.semver.version;
        }
      }

      return {
        original: versionString,
        requirement: {
          kind: "range",
          minimumVersion,
          maximumVersion,
        },
        isLocal: false,
      };
    }
  }

  // Try to parse as exact version
  if (semver.valid(trimmed)) {
    return {
      original: versionString,
      requirement: {
        kind: "exact",
        version: trimmed,
      },
      isLocal: false,
    };
  }

  // If nothing else matches, treat as branch name
  // Branch names can contain alphanumeric, hyphens, underscores, slashes
  if (/^[a-zA-Z0-9_\-\/]+$/.test(trimmed)) {
    return {
      original: versionString,
      requirement: {
        kind: "branch",
        branch: trimmed,
      },
      isLocal: false,
    };
  }

  throw new Error(
    `Unable to parse version string: "${versionString}". ` +
    `Supported formats: ^1.0.0, ~1.0.0, 1.0.0, >=1.0.0 <2.0.0, latest, branch-name, commit:hash, file:path`
  );
}

/**
 * Convert a Swift Package Manager requirement to a string representation
 * Useful for logging and debugging
 *
 * @param requirement The SPM requirement object
 * @returns String representation
 */
export function requirementToString(requirement: SwiftPackageRequirement): string {
  switch (requirement.kind) {
    case "upToNextMajorVersion":
      return `^${requirement.minimumVersion}`;
    case "upToNextMinorVersion":
      return `~${requirement.minimumVersion}`;
    case "exact":
      return requirement.version;
    case "range":
      return `${requirement.minimumVersion}..<${requirement.maximumVersion}`;
    case "branch":
      return `branch:${requirement.branch}`;
    case "revision":
      return `commit:${requirement.revision}`;
    case "latest":
      return "latest";
  }
}

/**
 * Validate a version string without parsing
 *
 * @param versionString The version string to validate
 * @returns true if valid, false otherwise
 */
export function isValidVersionString(versionString: string): boolean {
  try {
    parseVersionString(versionString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a version string to a consistent format
 * Useful for comparison and caching
 *
 * @param versionString The version string to normalize
 * @returns Normalized version string
 */
export function normalizeVersionString(versionString: string): string {
  const parsed = parseVersionString(versionString);
  return requirementToString(parsed.requirement);
}
