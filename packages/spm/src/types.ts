/**
 * Type definitions for @bacons/spm
 * Swift Package Manager dependency management for Expo projects
 */

/**
 * Version string types - supports npm-style versioning
 * Examples:
 * - "^1.0.0" - Compatible versions (caret)
 * - "~1.0.0" - Patch-level changes (tilde)
 * - "1.0.0" - Exact version
 * - ">=1.0.0 <2.0.0" - Version range
 * - "latest" - Latest release
 * - "develop" - Git branch
 * - "commit:abc123" - Specific commit
 * - "file:../local" - Local package
 */
export type PackageVersion = string;

/**
 * Platform minimum deployment targets
 */
export interface PlatformVersions {
  ios?: string;
  tvos?: string;
  watchos?: string;
  macos?: string;
  visionos?: string;
  catalyst?: string;
}

/**
 * Full package configuration object
 * Can be used instead of a simple version string for advanced configuration
 */
export interface PackageConfig {
  /** Required: Version requirement (npm-style string) */
  version: PackageVersion;

  /** Optional: Repository URL (if not using registry lookup) */
  url?: string;

  /** Optional: Local file path for local packages */
  path?: string;

  /** Optional: Specific products to link (libraries/frameworks from the package) */
  products?: string[];

  /** Optional: Use binary framework if available */
  binary?: boolean;

  /** Optional: Platform-specific deployment targets */
  platforms?: PlatformVersions;

  /** Optional: Build configuration settings */
  xcconfig?: Record<string, string>;

  /** Optional: iOS capabilities to enable */
  capabilities?: string[];

  /** Optional: Resource files to include */
  resources?: string[];

  /** Optional: Condition for inclusion */
  condition?: string;

  /** Optional: Mark as optional dependency */
  optional?: boolean;

  /** Optional: Authentication token for private repos */
  auth?: string;

  /** Optional: Use SSH for git operations */
  ssh?: boolean;
}

/**
 * Dependency can be a simple version string or a full configuration object
 */
export type DependencyValue = PackageVersion | PackageConfig;

/**
 * Dependencies map: package identifier -> version or config
 */
export interface Dependencies {
  [packageIdentifier: string]: DependencyValue;
}

/**
 * Global configuration options
 */
export interface GlobalConfig {
  /** Default platform versions for all packages */
  platforms?: PlatformVersions;

  /** Swift language version */
  swift?: string;

  /** Save exact versions (like npm --save-exact) */
  saveExact?: boolean;

  /** Version prefix for saves (default: "^") */
  savePrefix?: "^" | "~" | "";

  /** Enable parallel downloads */
  parallelDownloads?: boolean;

  /** Cache directory location */
  cacheDirectory?: string;

  /** Package registry URL */
  registry?: string;
}

/**
 * Main plugin configuration
 * Used in app.json or app.config.js
 */
export interface PluginConfig {
  /** Production dependencies */
  dependencies?: Dependencies;

  /** Development-only dependencies (build tools, etc.) */
  devDependencies?: Dependencies;

  /** Optional dependencies (won't fail build if unavailable) */
  optionalDependencies?: Dependencies;

  /** Override transitive dependency versions */
  overrides?: Dependencies;

  /** Package name aliases for monorepo support */
  aliases?: Record<string, string>;

  /** Global configuration options */
  config?: GlobalConfig;
}

/**
 * Swift Package Manager requirement types
 * Maps to Package.swift requirement syntax
 */
export type SwiftPackageRequirement =
  | { kind: "upToNextMajorVersion"; minimumVersion: string }
  | { kind: "upToNextMinorVersion"; minimumVersion: string }
  | { kind: "exact"; version: string }
  | { kind: "range"; minimumVersion: string; maximumVersion: string }
  | { kind: "branch"; branch: string }
  | { kind: "revision"; revision: string }
  | { kind: "latest" };

/**
 * Resolved package information
 * Result of package resolution process
 */
export interface ResolvedPackage {
  /** Package identifier (name or URL) */
  identifier: string;

  /** Repository URL */
  url: string;

  /** Version requirement for SPM */
  requirement: SwiftPackageRequirement;

  /** Products to link */
  products: string[];

  /** Optional: Local file path */
  path?: string;

  /** Is this a local package? */
  isLocal: boolean;

  /** Original configuration */
  config: PackageConfig;
}

/**
 * Package metadata from Swift Package Index
 */
export interface PackageMetadata {
  /** Package name */
  name: string;

  /** Repository URL */
  url: string;

  /** Available versions */
  versions: string[];

  /** Available products (libraries/frameworks) */
  products?: string[];

  /** Package description */
  description?: string;

  /** Stars/popularity */
  stars?: number;
}

/**
 * Result of version parsing
 */
export interface ParsedVersion {
  /** Original version string */
  original: string;

  /** Parsed requirement for SPM */
  requirement: SwiftPackageRequirement;

  /** Whether this is a local package */
  isLocal: boolean;

  /** Local path if applicable */
  localPath?: string;
}
