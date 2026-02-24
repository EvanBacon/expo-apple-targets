import type {
  DependencyValue,
  GlobalConfig,
  PackageConfig,
  PlatformVersions,
  PluginConfig,
  ValidPlatform,
} from "./types";
import { VALID_PLATFORMS } from "./types";
import { isValidVersionString } from "./version";

export class ValidationError extends Error {
  path?: string;

  constructor(message: string, path?: string) {
    super(path ? `${path}: ${message}` : message);
    this.name = "ValidationError";
    this.path = path;
  }
}

/** Validate the entire plugin config. Throws `ValidationError` on first issue. */
export function validatePluginConfig(input: unknown): asserts input is PluginConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError(
      "Plugin config must be a non-null object"
    );
  }

  const config = input as Record<string, unknown>;

  const hasDeps =
    config.dependencies ||
    config.devDependencies ||
    config.optionalDependencies;

  if (!hasDeps) {
    throw new ValidationError(
      "Config must have at least one of: dependencies, devDependencies, optionalDependencies"
    );
  }

  if (config.dependencies) {
    validateDependencies(config.dependencies, "dependencies");
  }
  if (config.devDependencies) {
    validateDependencies(config.devDependencies, "devDependencies");
  }
  if (config.optionalDependencies) {
    validateDependencies(config.optionalDependencies, "optionalDependencies");
  }
  if (config.overrides) {
    validateOverrides(config.overrides, "overrides");
  }
  if (config.aliases) {
    validateAliases(config.aliases, "aliases");
  }
  if (config.config) {
    validateGlobalConfig(config.config, "config");
  }
}

function validateDependencies(deps: unknown, path: string): void {
  if (!deps || typeof deps !== "object" || Array.isArray(deps)) {
    throw new ValidationError("Must be a non-null object", path);
  }

  for (const [name, value] of Object.entries(deps as Record<string, unknown>)) {
    validateDependencyValue(value, `${path}.${name}`);
  }
}

function validateDependencyValue(value: unknown, path: string): void {
  if (typeof value === "string") {
    if (!isValidVersionString(value)) {
      throw new ValidationError(
        `Invalid version string: "${value}"`,
        path
      );
    }
    return;
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    validatePackageConfig(value as Record<string, unknown>, path);
    return;
  }

  throw new ValidationError(
    "Dependency value must be a version string or config object",
    path
  );
}

function validatePackageConfig(
  config: Record<string, unknown>,
  path: string
): void {
  // Must have version, url+version, or path
  if (!config.version && !config.path) {
    throw new ValidationError(
      "Package config must have a 'version' or 'path' field",
      path
    );
  }

  if (config.version && typeof config.version === "string") {
    if (!isValidVersionString(config.version)) {
      throw new ValidationError(
        `Invalid version string: "${config.version}"`,
        `${path}.version`
      );
    }
  }

  if (config.url !== undefined) {
    if (typeof config.url !== "string") {
      throw new ValidationError("'url' must be a string", `${path}.url`);
    }
    if (!isValidPackageURL(config.url)) {
      throw new ValidationError(
        `Invalid package URL: "${config.url}"`,
        `${path}.url`
      );
    }
  }

  if (config.path !== undefined) {
    if (typeof config.path !== "string") {
      throw new ValidationError("'path' must be a string", `${path}.path`);
    }
  }

  if (config.products !== undefined) {
    if (!Array.isArray(config.products)) {
      throw new ValidationError(
        "'products' must be an array",
        `${path}.products`
      );
    }
    if (config.products.length === 0) {
      throw new ValidationError(
        "'products' array must not be empty",
        `${path}.products`
      );
    }
    for (const product of config.products) {
      if (typeof product !== "string") {
        throw new ValidationError(
          "Each product must be a string",
          `${path}.products`
        );
      }
    }
  }

  if (config.platforms !== undefined) {
    validatePlatformVersions(
      config.platforms,
      `${path}.platforms`
    );
  }

  if (config.binary !== undefined && typeof config.binary !== "boolean") {
    throw new ValidationError(
      "'binary' must be a boolean",
      `${path}.binary`
    );
  }

  if (config.optional !== undefined && typeof config.optional !== "boolean") {
    throw new ValidationError(
      "'optional' must be a boolean",
      `${path}.optional`
    );
  }

  if (config.targets !== undefined) {
    if (!Array.isArray(config.targets)) {
      throw new ValidationError(
        "'targets' must be an array of target names",
        `${path}.targets`
      );
    }
    for (const t of config.targets) {
      if (typeof t !== "string") {
        throw new ValidationError(
          "Each target must be a string",
          `${path}.targets`
        );
      }
    }
  }
}

function validatePlatformVersions(
  platforms: unknown,
  path: string
): void {
  if (!platforms || typeof platforms !== "object" || Array.isArray(platforms)) {
    throw new ValidationError("'platforms' must be an object", path);
  }

  for (const [platform, version] of Object.entries(
    platforms as Record<string, unknown>
  )) {
    if (!VALID_PLATFORMS.includes(platform as ValidPlatform)) {
      throw new ValidationError(
        `Invalid platform: "${platform}". Valid platforms: ${VALID_PLATFORMS.join(", ")}`,
        `${path}.${platform}`
      );
    }
    if (typeof version !== "string") {
      throw new ValidationError(
        "Platform version must be a string",
        `${path}.${platform}`
      );
    }
    if (!/^\d+(\.\d+){0,2}$/.test(version)) {
      throw new ValidationError(
        `Invalid platform version format: "${version}". Expected format like "16.0" or "16.0.0"`,
        `${path}.${platform}`
      );
    }
  }
}

function validateOverrides(overrides: unknown, path: string): void {
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides)
  ) {
    throw new ValidationError("'overrides' must be an object", path);
  }

  for (const [name, version] of Object.entries(
    overrides as Record<string, unknown>
  )) {
    if (typeof version !== "string") {
      throw new ValidationError(
        "Override version must be a string",
        `${path}.${name}`
      );
    }
    if (!isValidVersionString(version)) {
      throw new ValidationError(
        `Invalid override version: "${version}"`,
        `${path}.${name}`
      );
    }
  }
}

function validateAliases(aliases: unknown, path: string): void {
  if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) {
    throw new ValidationError("'aliases' must be an object", path);
  }

  for (const [name, url] of Object.entries(
    aliases as Record<string, unknown>
  )) {
    if (typeof url !== "string") {
      throw new ValidationError(
        "Alias value must be a string URL",
        `${path}.${name}`
      );
    }
  }
}

function validateGlobalConfig(config: unknown, path: string): void {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new ValidationError("'config' must be an object", path);
  }

  const c = config as Record<string, unknown>;

  if (c.platforms !== undefined) {
    validatePlatformVersions(c.platforms, `${path}.platforms`);
  }

  if (c.swift !== undefined && typeof c.swift !== "string") {
    throw new ValidationError(
      "'swift' must be a string",
      `${path}.swift`
    );
  }

  if (c.saveExact !== undefined && typeof c.saveExact !== "boolean") {
    throw new ValidationError(
      "'saveExact' must be a boolean",
      `${path}.saveExact`
    );
  }

  if (c.savePrefix !== undefined) {
    if (c.savePrefix !== "^" && c.savePrefix !== "~") {
      throw new ValidationError(
        `'savePrefix' must be "^" or "~"`,
        `${path}.savePrefix`
      );
    }
  }
}

function isValidPackageURL(url: string): boolean {
  // Accept git@... SSH URLs
  if (url.startsWith("git@")) return true;
  // Accept https/http URLs
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Validate and return a typed config, or throw. */
export function validateAndNormalizeConfig(input: unknown): PluginConfig {
  validatePluginConfig(input);
  return input;
}
