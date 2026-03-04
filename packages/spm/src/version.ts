import * as semver from "semver";

import type { ParsedVersion, SwiftPackageRequirement } from "./types";

/**
 * Parse an NPM-style version string into an SPM requirement.
 *
 * Supported formats:
 * - `"^1.2.3"` — upToNextMajorVersion
 * - `"~1.2.3"` — upToNextMinorVersion
 * - `"1.2.3"` — exact version
 * - `">=1.0.0 <2.0.0"` — range
 * - `"latest"` / `"*"` — latest (any version)
 * - `"develop"` — branch name
 * - `"commit:abc123def"` — revision
 * - `"file:../path"` — local package reference
 */
export function parseVersionString(input: string): ParsedVersion {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Version string cannot be empty");
  }

  // Local file reference
  if (trimmed.startsWith("file:")) {
    const localPath = trimmed.slice(5);
    if (!localPath) {
      throw new Error('Invalid local path: "file:" must be followed by a path');
    }
    return {
      original: trimmed,
      requirement: { kind: "exact", version: "0.0.0" },
      isLocal: true,
      localPath,
    };
  }

  // Git commit revision
  if (trimmed.startsWith("commit:")) {
    const revision = trimmed.slice(7);
    if (!revision) {
      throw new Error(
        'Invalid revision: "commit:" must be followed by a commit hash'
      );
    }
    return {
      original: trimmed,
      requirement: { kind: "revision", revision },
      isLocal: false,
    };
  }

  // Latest / wildcard
  if (trimmed === "latest" || trimmed === "*") {
    return {
      original: trimmed,
      requirement: { kind: "latest" },
      isLocal: false,
    };
  }

  // Caret range: ^1.2.3
  if (trimmed.startsWith("^")) {
    const version = semver.coerce(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid caret version: "${trimmed}"`);
    }
    return {
      original: trimmed,
      requirement: {
        kind: "upToNextMajorVersion",
        minimumVersion: version.version,
      },
      isLocal: false,
    };
  }

  // Tilde range: ~1.2.3
  if (trimmed.startsWith("~")) {
    const version = semver.coerce(trimmed.slice(1));
    if (!version) {
      throw new Error(`Invalid tilde version: "${trimmed}"`);
    }
    return {
      original: trimmed,
      requirement: {
        kind: "upToNextMinorVersion",
        minimumVersion: version.version,
      },
      isLocal: false,
    };
  }

  // Explicit range: >=1.0.0 <2.0.0
  const rangeMatch = trimmed.match(
    /^>=\s*([\d.]+)\s+<\s*([\d.]+)$/
  );
  if (rangeMatch) {
    const min = semver.coerce(rangeMatch[1]);
    const max = semver.coerce(rangeMatch[2]);
    if (!min || !max) {
      throw new Error(`Invalid range version: "${trimmed}"`);
    }
    return {
      original: trimmed,
      requirement: {
        kind: "range",
        minimumVersion: min.version,
        maximumVersion: max.version,
      },
      isLocal: false,
    };
  }

  // Exact semver: 1.2.3
  const exact = semver.valid(semver.coerce(trimmed));
  if (exact && /^\d/.test(trimmed)) {
    return {
      original: trimmed,
      requirement: { kind: "exact", version: exact },
      isLocal: false,
    };
  }

  // Branch name: anything that looks like an identifier
  if (/^[a-zA-Z][a-zA-Z0-9._\-/]*$/.test(trimmed)) {
    return {
      original: trimmed,
      requirement: { kind: "branch", branch: trimmed },
      isLocal: false,
    };
  }

  throw new Error(
    `Invalid version string: "${trimmed}". Expected a semver version, range, branch name, "latest", "commit:<hash>", or "file:<path>".`
  );
}

/** Convert an SPM requirement back into a human-readable string. */
export function requirementToString(req: SwiftPackageRequirement): string {
  switch (req.kind) {
    case "upToNextMajorVersion":
      return `^${req.minimumVersion}`;
    case "upToNextMinorVersion":
      return `~${req.minimumVersion}`;
    case "exact":
      return req.version;
    case "range":
      return `>=${req.minimumVersion} <${req.maximumVersion}`;
    case "branch":
      return req.branch;
    case "revision":
      return `commit:${req.revision}`;
    case "latest":
      return "latest";
  }
}

/** Check if a version string is valid. */
export function isValidVersionString(input: string): boolean {
  try {
    parseVersionString(input);
    return true;
  } catch {
    return false;
  }
}

/** Normalize a version string by parsing then stringifying. */
export function normalizeVersionString(input: string): string {
  const parsed = parseVersionString(input);
  if (parsed.isLocal) {
    return `file:${parsed.localPath}`;
  }
  return requirementToString(parsed.requirement);
}
