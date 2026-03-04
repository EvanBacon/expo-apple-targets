/**
 * NPM-style version string for Swift packages.
 *
 * Examples:
 * - `"^1.2.3"` — up to next major (>=1.2.3 <2.0.0)
 * - `"~1.2.3"` — up to next minor (>=1.2.3 <1.3.0)
 * - `"1.2.3"` — exact version
 * - `">=1.0.0 <2.0.0"` — explicit range
 * - `"latest"` or `"*"` — any version
 * - `"develop"` — branch name
 * - `"commit:abc123"` — specific revision
 * - `"file:../local-package"` — local path
 */
export type PackageVersion = string;

/** Minimum platform deployment targets. */
export interface PlatformVersions {
  ios?: string;
  tvos?: string;
  watchos?: string;
  macos?: string;
  visionos?: string;
  catalyst?: string;
}

/** Full configuration object for a single Swift package. */
export interface PackageConfig {
  /** NPM-style version string. */
  version?: PackageVersion;
  /** Full git URL for the package repository. */
  url?: string;
  /** Local file path (alternative to url). */
  path?: string;
  /** Specific product names to link from the package. When omitted, auto-resolved from Package.swift. */
  products?: string[];
  /** Whether this is a binary target / xcframework. */
  binary?: boolean;
  /** Minimum platform versions this package requires. */
  platforms?: PlatformVersions;
  /** Additional xcconfig build settings for targets using this package. */
  xcconfig?: Record<string, string>;
  /** App capabilities required by this package (e.g. push notifications). */
  capabilities?: string[];
  /** Additional resource paths to include from this package. */
  resources?: string[];
  /** Platform condition for when this package should be linked. */
  condition?: {
    platforms?: string[];
  };
  /** If true, build continues even if the package is unavailable. */
  optional?: boolean;
  /** Which targets to link this package to. When omitted, links to the main app target. */
  targets?: string[];
}

/** Value for a single dependency: either a version string or full config object. */
export type DependencyValue = PackageVersion | PackageConfig;

/** Map of package identifiers to their dependency configuration. */
export type Dependencies = Record<string, DependencyValue>;

/** Global plugin configuration that applies to all packages. */
export interface GlobalConfig {
  /** Default minimum platform versions. */
  platforms?: PlatformVersions;
  /** Swift language version. */
  swift?: string;
  /** If true, save versions without range operators (exact versions). */
  saveExact?: boolean;
  /** Default prefix for saving versions ("^" or "~"). */
  savePrefix?: "^" | "~";
}

/** Top-level plugin configuration passed via app.json or app.config.js. */
export interface PluginConfig {
  /** Production dependencies. */
  dependencies?: Dependencies;
  /** Development-only dependencies (excluded from release builds). */
  devDependencies?: Dependencies;
  /** Optional dependencies that don't fail the build if unavailable. */
  optionalDependencies?: Dependencies;
  /** Version overrides for transitive dependencies. */
  overrides?: Record<string, PackageVersion>;
  /** Short-name aliases for package URLs. */
  aliases?: Record<string, string>;
  /** Global configuration. */
  config?: GlobalConfig;
}

/**
 * Discriminated union representing SPM version requirements
 * in the format Xcode understands.
 */
export type SwiftPackageRequirement =
  | { kind: "upToNextMajorVersion"; minimumVersion: string }
  | { kind: "upToNextMinorVersion"; minimumVersion: string }
  | { kind: "exact"; version: string }
  | { kind: "range"; minimumVersion: string; maximumVersion: string }
  | { kind: "branch"; branch: string }
  | { kind: "revision"; revision: string }
  | { kind: "latest" };

/** A fully resolved package ready for Xcode project insertion. */
export interface ResolvedPackage {
  /** Unique identifier for the package (usually the repo name). */
  identifier: string;
  /** Git URL for remote packages. */
  url?: string;
  /** SPM version requirement. */
  requirement: SwiftPackageRequirement;
  /** Product names to link. */
  products: string[];
  /** Local path for local packages. */
  path?: string;
  /** Whether this is a local package. */
  isLocal: boolean;
  /** Original package configuration. */
  config?: PackageConfig;
  /** Which targets to link to. */
  targets?: string[];
}

/** Result of parsing a version string. */
export interface ParsedVersion {
  /** Original input string. */
  original: string;
  /** Parsed SPM requirement. */
  requirement: SwiftPackageRequirement;
  /** Whether this is a local package reference. */
  isLocal: boolean;
  /** Local file path if isLocal is true. */
  localPath?: string;
}

export const VALID_PLATFORMS = [
  "ios",
  "tvos",
  "watchos",
  "macos",
  "visionos",
  "catalyst",
] as const;

export type ValidPlatform = (typeof VALID_PLATFORMS)[number];
