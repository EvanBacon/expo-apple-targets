/**
 * Configuration validation for @bacons/spm
 * Validates plugin configuration and provides helpful error messages
 */

import {
  PluginConfig,
  DependencyValue,
  PackageConfig,
  Dependencies,
} from "./types";
import { isValidVersionString } from "./version";

/**
 * Validation error class with helpful messages
 */
export class ValidationError extends Error {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate the entire plugin configuration
 *
 * @param config Plugin configuration object
 * @throws ValidationError if configuration is invalid
 */
export function validatePluginConfig(config: unknown): asserts config is PluginConfig {
  if (!config || typeof config !== "object") {
    throw new ValidationError(
      "Plugin configuration must be an object. " +
      "Example: { dependencies: { firebase: '^10.0.0' } }"
    );
  }

  const cfg = config as any;

  // Validate dependencies
  if (cfg.dependencies !== undefined) {
    validateDependencies(cfg.dependencies, "dependencies");
  }

  // Validate devDependencies
  if (cfg.devDependencies !== undefined) {
    validateDependencies(cfg.devDependencies, "devDependencies");
  }

  // Validate optionalDependencies
  if (cfg.optionalDependencies !== undefined) {
    validateDependencies(cfg.optionalDependencies, "optionalDependencies");
  }

  // Validate overrides
  if (cfg.overrides !== undefined) {
    validateDependencies(cfg.overrides, "overrides");
  }

  // Validate aliases
  if (cfg.aliases !== undefined) {
    validateAliases(cfg.aliases);
  }

  // Validate global config
  if (cfg.config !== undefined) {
    validateGlobalConfig(cfg.config);
  }

  // Ensure at least one dependency section exists
  if (
    !cfg.dependencies &&
    !cfg.devDependencies &&
    !cfg.optionalDependencies
  ) {
    throw new ValidationError(
      "Plugin configuration must include at least one of: dependencies, devDependencies, or optionalDependencies"
    );
  }
}

/**
 * Validate a dependencies object
 */
function validateDependencies(
  dependencies: unknown,
  section: string
): asserts dependencies is Dependencies {
  if (typeof dependencies !== "object" || dependencies === null) {
    throw new ValidationError(
      `${section} must be an object`,
      section
    );
  }

  const deps = dependencies as Record<string, unknown>;

  for (const [packageId, value] of Object.entries(deps)) {
    validateDependencyValue(value, `${section}.${packageId}`, packageId);
  }
}

/**
 * Validate a single dependency value (string or object)
 */
function validateDependencyValue(
  value: unknown,
  path: string,
  packageId: string
): asserts value is DependencyValue {
  if (typeof value === "string") {
    // Simple version string
    validateVersionString(value, path);
  } else if (typeof value === "object" && value !== null) {
    // Full package configuration
    validatePackageConfig(value, path, packageId);
  } else {
    throw new ValidationError(
      `Dependency value must be a string or object, got ${typeof value}. ` +
      `Example: "${packageId}": "^1.0.0" or "${packageId}": { version: "^1.0.0", products: ["..."] }`,
      path
    );
  }
}

/**
 * Validate a version string
 */
function validateVersionString(versionString: string, path: string): void {
  if (!versionString || versionString.trim().length === 0) {
    throw new ValidationError(
      "Version string cannot be empty",
      path
    );
  }

  if (!isValidVersionString(versionString)) {
    throw new ValidationError(
      `Invalid version string: "${versionString}". ` +
      `Supported formats: ^1.0.0, ~1.0.0, 1.0.0, >=1.0.0 <2.0.0, latest, branch-name, commit:hash, file:path`,
      path
    );
  }
}

/**
 * Validate a package configuration object
 */
function validatePackageConfig(
  config: unknown,
  path: string,
  packageId: string
): asserts config is PackageConfig {
  if (typeof config !== "object" || config === null) {
    throw new ValidationError(
      "Package configuration must be an object",
      path
    );
  }

  const cfg = config as any;

  // Require version field
  if (!cfg.version) {
    throw new ValidationError(
      `Package configuration must include a "version" field. ` +
      `Example: { version: "^1.0.0" }`,
      `${path}.version`
    );
  }

  // Validate version string
  validateVersionString(cfg.version, `${path}.version`);

  // Validate url if provided
  if (cfg.url !== undefined) {
    if (typeof cfg.url !== "string") {
      throw new ValidationError(
        `"url" must be a string`,
        `${path}.url`
      );
    }
    if (!cfg.url.startsWith("http://") && !cfg.url.startsWith("https://") && !cfg.url.startsWith("git@")) {
      throw new ValidationError(
        `"url" must be a valid HTTP/HTTPS URL or Git SSH URL`,
        `${path}.url`
      );
    }
  }

  // Validate path if provided
  if (cfg.path !== undefined) {
    if (typeof cfg.path !== "string") {
      throw new ValidationError(
        `"path" must be a string`,
        `${path}.path`
      );
    }
  }

  // Validate products if provided
  if (cfg.products !== undefined) {
    if (!Array.isArray(cfg.products)) {
      throw new ValidationError(
        `"products" must be an array of strings`,
        `${path}.products`
      );
    }
    if (cfg.products.length === 0) {
      throw new ValidationError(
        `"products" array cannot be empty. Either specify products or omit the field for auto-resolution.`,
        `${path}.products`
      );
    }
    cfg.products.forEach((product: unknown, index: number) => {
      if (typeof product !== "string") {
        throw new ValidationError(
          `Product at index ${index} must be a string`,
          `${path}.products[${index}]`
        );
      }
    });
  }

  // Validate platforms if provided
  if (cfg.platforms !== undefined) {
    validatePlatforms(cfg.platforms, `${path}.platforms`);
  }

  // Validate xcconfig if provided
  if (cfg.xcconfig !== undefined) {
    if (typeof cfg.xcconfig !== "object" || cfg.xcconfig === null) {
      throw new ValidationError(
        `"xcconfig" must be an object`,
        `${path}.xcconfig`
      );
    }
  }

  // Validate capabilities if provided
  if (cfg.capabilities !== undefined) {
    if (!Array.isArray(cfg.capabilities)) {
      throw new ValidationError(
        `"capabilities" must be an array of strings`,
        `${path}.capabilities`
      );
    }
  }

  // Validate binary if provided
  if (cfg.binary !== undefined && typeof cfg.binary !== "boolean") {
    throw new ValidationError(
      `"binary" must be a boolean`,
      `${path}.binary`
    );
  }

  // Validate optional if provided
  if (cfg.optional !== undefined && typeof cfg.optional !== "boolean") {
    throw new ValidationError(
      `"optional" must be a boolean`,
      `${path}.optional`
    );
  }
}

/**
 * Validate platform versions
 */
function validatePlatforms(platforms: unknown, path: string): void {
  if (typeof platforms !== "object" || platforms === null) {
    throw new ValidationError(
      "Platforms must be an object",
      path
    );
  }

  const validPlatforms = ["ios", "tvos", "watchos", "macos", "visionos", "catalyst"];
  const plat = platforms as Record<string, unknown>;

  for (const [platform, version] of Object.entries(plat)) {
    if (!validPlatforms.includes(platform)) {
      throw new ValidationError(
        `Invalid platform "${platform}". Valid platforms: ${validPlatforms.join(", ")}`,
        `${path}.${platform}`
      );
    }

    if (typeof version !== "string") {
      throw new ValidationError(
        `Platform version must be a string (e.g., "14.0")`,
        `${path}.${platform}`
      );
    }

    // Validate version format (should be like "14.0" or "14.0.0")
    if (!/^\d+(\.\d+){0,2}$/.test(version)) {
      throw new ValidationError(
        `Invalid platform version format: "${version}". Expected format: "14.0" or "14.0.0"`,
        `${path}.${platform}`
      );
    }
  }
}

/**
 * Validate aliases configuration
 */
function validateAliases(aliases: unknown): void {
  if (typeof aliases !== "object" || aliases === null) {
    throw new ValidationError(
      "Aliases must be an object",
      "aliases"
    );
  }

  const als = aliases as Record<string, unknown>;

  for (const [alias, target] of Object.entries(als)) {
    if (typeof target !== "string") {
      throw new ValidationError(
        `Alias target must be a string`,
        `aliases.${alias}`
      );
    }
  }
}

/**
 * Validate global configuration
 */
function validateGlobalConfig(config: unknown): void {
  if (typeof config !== "object" || config === null) {
    throw new ValidationError(
      "Global config must be an object",
      "config"
    );
  }

  const cfg = config as any;

  // Validate platforms if provided
  if (cfg.platforms !== undefined) {
    validatePlatforms(cfg.platforms, "config.platforms");
  }

  // Validate swift version if provided
  if (cfg.swift !== undefined) {
    if (typeof cfg.swift !== "string") {
      throw new ValidationError(
        `Swift version must be a string (e.g., "5.9")`,
        "config.swift"
      );
    }
  }

  // Validate savePrefix if provided
  if (cfg.savePrefix !== undefined) {
    if (!["^", "~", ""].includes(cfg.savePrefix)) {
      throw new ValidationError(
        `savePrefix must be "^", "~", or ""`,
        "config.savePrefix"
      );
    }
  }

  // Validate boolean options
  const booleanOptions = ["saveExact", "parallelDownloads"];
  for (const option of booleanOptions) {
    if (cfg[option] !== undefined && typeof cfg[option] !== "boolean") {
      throw new ValidationError(
        `${option} must be a boolean`,
        `config.${option}`
      );
    }
  }
}

/**
 * Validate and normalize plugin configuration
 * This function both validates and normalizes the configuration
 *
 * @param config Raw plugin configuration
 * @returns Validated and normalized configuration
 */
export function validateAndNormalizeConfig(config: unknown): PluginConfig {
  validatePluginConfig(config);

  // Configuration is valid, return as-is
  // In the future, we could add normalization logic here
  return config as PluginConfig;
}
