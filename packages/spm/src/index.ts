/**
 * @bacons/spm - Swift Package Manager for Expo
 * NPM-style dependency management for Swift packages in Expo projects
 */

import { ConfigPlugin, createRunOncePlugin } from "@expo/config-plugins";
import {
  PluginConfig,
  ResolvedPackage,
  PackageConfig,
  DependencyValue,
} from "./types";
import { validateAndNormalizeConfig, ValidationError } from "./validation";
import { parseVersionString } from "./version";
import { resolvePackageURL, autoResolveProducts } from "./registry";
import { addSwiftPackagesToXcodeProject } from "./xcode";
import {
  withXcodeProjectMod,
  withXcodeProjectBaseMod,
} from "./withXcodeProject";

/**
 * Main plugin implementation
 * Processes Swift Package Manager dependencies and adds them to the Xcode project
 */
const withSwiftPackageManager: ConfigPlugin<PluginConfig | void> = (
  config,
  props
) => {
  // If no configuration provided, return config unchanged
  if (!props) {
    console.warn(
      "[@bacons/spm] No configuration provided. Plugin will not make any changes."
    );
    return config;
  }

  // Validate configuration
  let validatedConfig: PluginConfig;
  try {
    validatedConfig = validateAndNormalizeConfig(props);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(
        `[@bacons/spm] Configuration error: ${error.message}` +
          (error.path ? ` (at ${error.path})` : "")
      );
    }
    throw error;
  }

  // Add the actual SPM configuration logic
  config = withXcodeProjectMod(config, async (config) => {
    const project = config.modResults;

    try {
      // Process dependencies
      const allPackages: ResolvedPackage[] = [];

      // Process regular dependencies
      if (validatedConfig.dependencies) {
        const packages = await processDependencies(
          validatedConfig.dependencies,
          "dependencies"
        );
        allPackages.push(...packages);
      }

      // MVP: devDependencies are treated the same as dependencies
      // In the future, these could be excluded from production builds
      if (validatedConfig.devDependencies) {
        const packages = await processDependencies(
          validatedConfig.devDependencies,
          "devDependencies"
        );
        allPackages.push(...packages);
      }

      // Process optional dependencies
      // These are handled the same way for now, but could fail gracefully in the future
      if (validatedConfig.optionalDependencies) {
        const packages = await processDependencies(
          validatedConfig.optionalDependencies,
          "optionalDependencies"
        );
        allPackages.push(...packages);
      }

      // Add all packages to the Xcode project
      if (allPackages.length > 0) {
        console.log(
          `[@bacons/spm] Adding ${allPackages.length} Swift package(s) to Xcode project...`
        );
        await addSwiftPackagesToXcodeProject(project, allPackages);
        console.log("[@bacons/spm] Successfully configured Swift packages");
      } else {
        console.warn("[@bacons/spm] No packages to add");
      }
    } catch (error: any) {
      throw new Error(
        `[@bacons/spm] Failed to configure Swift packages: ${error.message}`
      );
    }

    return config;
  });

  // Register the base mod for Xcode project manipulation
  config = withXcodeProjectBaseMod(config);

  return config;
};

/**
 * Process a dependencies object and resolve all packages
 */
async function processDependencies(
  dependencies: Record<string, DependencyValue>,
  section: string
): Promise<ResolvedPackage[]> {
  const packages: ResolvedPackage[] = [];

  for (const [identifier, value] of Object.entries(dependencies)) {
    try {
      const resolvedPackage = await resolvePackage(identifier, value);
      packages.push(resolvedPackage);

      console.log(
        `[@bacons/spm] Resolved ${identifier} -> ${resolvedPackage.url} ` +
          `(products: ${resolvedPackage.products.join(", ") || "auto"})`
      );
    } catch (error: any) {
      console.error(
        `[@bacons/spm] Failed to resolve package "${identifier}" in ${section}: ${error.message}`
      );
      throw error;
    }
  }

  return packages;
}

/**
 * Resolve a single package from identifier and value
 */
async function resolvePackage(
  identifier: string,
  value: DependencyValue
): Promise<ResolvedPackage> {
  // Convert string value to PackageConfig
  const packageConfig: PackageConfig =
    typeof value === "string" ? { version: value } : value;

  // Parse version string
  const parsedVersion = parseVersionString(packageConfig.version);

  // Determine if this is a local package
  const isLocal = parsedVersion.isLocal;

  // Resolve package URL
  let url: string;
  let localPath: string | undefined;

  if (isLocal) {
    // Local package
    localPath = packageConfig.path || parsedVersion.localPath;
    if (!localPath) {
      throw new Error(
        `Local package "${identifier}" requires a path. Use file:../path or provide path in config.`
      );
    }
    // For local packages, use the identifier as the URL (it won't be used by Xcode)
    url = identifier;
  } else {
    // Remote package - resolve URL
    url = packageConfig.url || (await resolvePackageURL(identifier));
  }

  // Resolve products
  let products: string[] = packageConfig.products || [];

  // Auto-resolve products if not specified and not local
  if (products.length === 0 && !isLocal) {
    console.log(`[@bacons/spm] Auto-resolving products for ${identifier}...`);
    const autoProducts = await autoResolveProducts(url);

    if (autoProducts.length > 0) {
      products = autoProducts;
      console.log(`[@bacons/spm] Found products: ${products.join(", ")}`);
    } else {
      console.warn(
        `[@bacons/spm] Could not auto-resolve products for ${identifier}. ` +
          `The package might not have a Package.swift or products may need to be specified manually.`
      );
      // Use a default product name based on the identifier
      // This is a best-effort fallback
      const defaultProduct = identifier.split("/").pop() || identifier;
      products = [defaultProduct];
      console.warn(
        `[@bacons/spm] Using fallback product name: ${defaultProduct}`
      );
    }
  }

  // Create resolved package
  const resolvedPackage: ResolvedPackage = {
    identifier,
    url,
    requirement: parsedVersion.requirement,
    products,
    path: localPath,
    isLocal,
    config: packageConfig,
  };

  return resolvedPackage;
}

/**
 * Export the plugin with run-once wrapper to prevent duplicate registration
 */
export default createRunOncePlugin(
  withSwiftPackageManager,
  "@bacons/spm",
  "1.0.0"
);

// Export types for consumers
export * from "./types";
export { ValidationError } from "./validation";
export {
  parseVersionString,
  requirementToString,
  isValidVersionString,
} from "./version";
export {
  resolvePackageURL,
  fetchPackageMetadata,
  autoResolveProducts,
} from "./registry";
