import { XcodeProject } from "@bacons/xcode";
import * as xcodeParse from "@bacons/xcode/json";
import {
  BaseMods,
  ConfigPlugin,
  createRunOncePlugin,
  IOSConfig,
  Mod,
  withMod,
} from "expo/config-plugins";
import _debug from "debug";
import fs from "fs";

import type {
  DependencyValue,
  PackageConfig,
  PluginConfig,
  ResolvedPackage,
} from "./types";
import { validatePluginConfig } from "./validation";
import { parseVersionString } from "./version";
import { resolvePackageURL, extractPackageName, getDefaultProductsForAlias } from "./registry";
import { addSwiftPackagesToXcodeProject } from "./xcode";

const debug = _debug("spm:plugin");

const CUSTOM_MOD_NAME = "xcodeProjectSpm";

/**
 * Expo config plugin modifier that provides XcodeProject as modResults.
 * Uses a custom base mod to ensure proper read/write lifecycle.
 */
const withXcodeProjectMod: ConfigPlugin<Mod<XcodeProject>> = (
  config,
  action
) => {
  return withMod(config, {
    platform: "ios",
    mod: CUSTOM_MOD_NAME,
    action,
  });
};

/** Register the base mod that handles reading/writing the Xcode project. */
const withXcodeProjectBaseModInternal: ConfigPlugin = (config) => {
  return BaseMods.withGeneratedBaseMods(config, {
    platform: "ios",
    saveToInternal: true,
    skipEmptyMod: false,
    providers: {
      [CUSTOM_MOD_NAME]: BaseMods.provider<XcodeProject>({
        isIntrospective: false,
        async getFilePath({ _internal }) {
          return IOSConfig.Paths.getPBXProjectPath(_internal!.projectRoot);
        },
        async read(filePath) {
          try {
            return XcodeProject.open(filePath);
          } catch (error: any) {
            throw new Error(
              `Failed to parse the Xcode project: "${filePath}". ${error.message}`
            );
          }
        },
        async write(filePath, { modResults, modRequest: { introspect } }) {
          if (introspect) return;
          const contents = xcodeParse.build(modResults.toJSON());
          if (contents.trim().length) {
            await fs.promises.writeFile(filePath, contents);
          }
        },
      }),
    },
  });
};

const withXcodeProjectBaseMod = createRunOncePlugin(
  withXcodeProjectBaseModInternal,
  "withSpmXcodeProjectBaseMod"
);

/**
 * Check if a string looks like a local file path.
 */
function isLocalPath(value: string): boolean {
  return value.startsWith("./") || value.startsWith("../") || value.startsWith("/");
}

/**
 * Resolve a single package identifier + dependency value into a ResolvedPackage.
 */
export function resolvePackage(
  identifier: string,
  value: DependencyValue,
  aliases?: Record<string, string>
): ResolvedPackage {
  // Handle shorthand: "LocalSPM": "../path/to/package"
  // Detect local paths and convert to path config
  const config: PackageConfig =
    typeof value === "string"
      ? isLocalPath(value)
        ? { path: value }
        : { version: value }
      : value;

  const version = config.version ?? "latest";
  const parsed = parseVersionString(version);

  // Determine if local
  if (parsed.isLocal || config.path) {
    const localPath = config.path ?? parsed.localPath!;
    return {
      identifier,
      path: localPath,
      requirement: parsed.requirement,
      products: config.products ?? [identifier],
      isLocal: true,
      config,
      targets: config.targets,
    };
  }

  // Resolve URL
  const url =
    config.url ?? resolvePackageURL(identifier, aliases);

  if (!url) {
    throw new Error(
      `Could not resolve package URL for "${identifier}". ` +
        `Provide a "url" field, use a known alias, or use "owner/repo" GitHub shorthand.`
    );
  }

  // Determine products: explicit config > alias defaults > derive from package name
  const products =
    config.products ??
    getDefaultProductsForAlias(identifier) ??
    [extractPackageName(url)];

  return {
    identifier,
    url,
    requirement: parsed.requirement,
    products,
    isLocal: false,
    config,
    targets: config.targets,
  };
}

/**
 * Process a dependencies map into an array of resolved packages.
 */
function processDependencies(
  deps: Record<string, DependencyValue>,
  aliases?: Record<string, string>
): ResolvedPackage[] {
  const resolved: ResolvedPackage[] = [];

  for (const [identifier, value] of Object.entries(deps)) {
    try {
      resolved.push(resolvePackage(identifier, value, aliases));
    } catch (error: any) {
      throw new Error(
        `Error resolving package "${identifier}": ${error.message}`
      );
    }
  }

  return resolved;
}

/**
 * Main Expo config plugin for Swift Package Manager support.
 *
 * Usage in app.json:
 * ```json
 * {
 *   "plugins": [
 *     ["@bacons/spm", {
 *       "dependencies": {
 *         "firebase": "^11.0.0",
 *         "alamofire": "~5.9.0",
 *         "https://github.com/SnapKit/SnapKit.git": {
 *           "version": "^5.7.0",
 *           "products": ["SnapKit"]
 *         }
 *       }
 *     }]
 *   ]
 * }
 * ```
 */
const withSwiftPackageManager: ConfigPlugin<PluginConfig> = (
  config,
  pluginConfig
) => {
  // Validate the configuration
  validatePluginConfig(pluginConfig);

  debug("Processing SPM config: %O", pluginConfig);

  // Apply the Xcode project modifications
  // NOTE: The base mod provider must be registered AFTER the mods that use it
  config = withXcodeProjectMod(config, async (config) => {
    const project = config.modResults;

    // Collect all packages from all dependency sections
    const allPackages: ResolvedPackage[] = [];

    if (pluginConfig.dependencies) {
      allPackages.push(
        ...processDependencies(
          pluginConfig.dependencies,
          pluginConfig.aliases
        )
      );
    }

    if (pluginConfig.devDependencies) {
      allPackages.push(
        ...processDependencies(
          pluginConfig.devDependencies,
          pluginConfig.aliases
        )
      );
    }

    if (pluginConfig.optionalDependencies) {
      for (const [identifier, value] of Object.entries(
        pluginConfig.optionalDependencies
      )) {
        try {
          allPackages.push(
            resolvePackage(identifier, value, pluginConfig.aliases)
          );
        } catch (error: any) {
          // Optional deps just warn instead of throwing
          console.warn(
            `[spm] Optional dependency "${identifier}" could not be resolved: ${error.message}`
          );
        }
      }
    }

    debug("Resolved %d packages", allPackages.length);

    // Add all packages to the Xcode project
    addSwiftPackagesToXcodeProject(project, allPackages);

    return config;
  });

  // Register the base mod provider (must be AFTER the mods that use it)
  config = withXcodeProjectBaseMod(config);

  return config;
};

const pkg = require("../package.json");

export default createRunOncePlugin(
  withSwiftPackageManager,
  pkg.name,
  pkg.version
);

// Named exports for library consumers
export { withSwiftPackageManager };
export { parseVersionString, requirementToString, isValidVersionString, normalizeVersionString } from "./version";
export { validatePluginConfig, validateAndNormalizeConfig, ValidationError } from "./validation";
export { resolvePackageURL, extractPackageName, extractProductsFromManifest, getDefaultProductsForAlias, PACKAGE_ALIASES, PACKAGE_ALIAS_REGISTRY } from "./registry";
export {
  addSwiftPackagesToXcodeProject,
  removeSwiftPackageFromXcodeProject,
  listSwiftPackagesInProject,
  convertRequirementToXcodeFormat,
  findExistingRemotePackageReference,
  findExistingLocalPackageReference,
  findExistingProductDependency,
} from "./xcode";
export type {
  PluginConfig,
  PackageConfig,
  PackageVersion,
  DependencyValue,
  Dependencies,
  GlobalConfig,
  PlatformVersions,
  SwiftPackageRequirement,
  ResolvedPackage,
  ParsedVersion,
} from "./types";
