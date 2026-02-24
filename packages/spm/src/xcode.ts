import {
  PBXNativeTarget,
  XCLocalSwiftPackageReference,
  XCRemoteSwiftPackageReference,
  XCSwiftPackageProductDependency,
  XcodeProject,
} from "@bacons/xcode";
import _debug from "debug";

import type { ResolvedPackage, SwiftPackageRequirement } from "./types";

const debug = _debug("spm:xcode");

/**
 * Add all resolved Swift packages to the Xcode project.
 * Handles both local and remote packages, deduplication, and product linking.
 */
export function addSwiftPackagesToXcodeProject(
  project: XcodeProject,
  packages: ResolvedPackage[],
  targetName?: string
): void {
  for (const pkg of packages) {
    if (pkg.isLocal) {
      addLocalPackage(project, pkg, targetName);
    } else {
      addRemotePackage(project, pkg, targetName);
    }
  }
}

/**
 * Add a remote Swift package reference to the project and link products to the target.
 */
function addRemotePackage(
  project: XcodeProject,
  pkg: ResolvedPackage,
  targetName?: string
): void {
  if (!pkg.url) {
    throw new Error(
      `Remote package "${pkg.identifier}" must have a URL`
    );
  }

  debug("Adding remote package: %s (%s)", pkg.identifier, pkg.url);

  // Check for existing package reference
  let packageRef = findExistingRemotePackageReference(project, pkg.url);

  if (!packageRef) {
    const requirement = convertRequirementToXcodeFormat(pkg.requirement);
    packageRef = XCRemoteSwiftPackageReference.create(project, {
      repositoryURL: pkg.url,
      requirement,
    });

    // Add to project-level package references
    if (!project.rootObject.props.packageReferences) {
      project.rootObject.props.packageReferences = [];
    }
    project.rootObject.props.packageReferences.push(packageRef);
    debug("Created new package reference for: %s", pkg.url);
  } else {
    debug("Found existing package reference for: %s", pkg.url);
  }

  // Link products to target(s)
  const targets = resolveTargets(project, pkg.targets, targetName);
  for (const target of targets) {
    linkProductsToTarget(project, target, pkg.products, packageRef);
  }
}

/**
 * Add a local Swift package reference to the project and link products to the target.
 */
function addLocalPackage(
  project: XcodeProject,
  pkg: ResolvedPackage,
  targetName?: string
): void {
  if (!pkg.path) {
    throw new Error(
      `Local package "${pkg.identifier}" must have a path`
    );
  }

  debug("Adding local package: %s (%s)", pkg.identifier, pkg.path);

  let packageRef = findExistingLocalPackageReference(project, pkg.path);

  if (!packageRef) {
    packageRef = XCLocalSwiftPackageReference.create(project, {
      path: pkg.path,
    });

    if (!project.rootObject.props.packageReferences) {
      project.rootObject.props.packageReferences = [];
    }
    project.rootObject.props.packageReferences.push(packageRef);
    debug("Created new local package reference for: %s", pkg.path);
  } else {
    debug("Found existing local package reference for: %s", pkg.path);
  }

  const targets = resolveTargets(project, pkg.targets, targetName);
  for (const target of targets) {
    linkProductsToTarget(project, target, pkg.products, packageRef);
  }
}

/**
 * Resolve which targets to link packages to.
 * If specific target names are given, find them; otherwise use the main app target.
 */
function resolveTargets(
  project: XcodeProject,
  targetNames?: string[],
  defaultTargetName?: string
): PBXNativeTarget[] {
  const allTargets = project.rootObject.props.targets.filter(
    (t): t is PBXNativeTarget => PBXNativeTarget.is(t)
  );

  if (targetNames && targetNames.length > 0) {
    const resolved: PBXNativeTarget[] = [];
    for (const name of targetNames) {
      const found = allTargets.find(
        (t) =>
          t.props.name === name ||
          t.props.productName === name
      );
      if (found) {
        resolved.push(found);
      } else {
        console.warn(
          `[spm] Target "${name}" not found in Xcode project, skipping`
        );
      }
    }
    return resolved;
  }

  // Use default target name or fall back to main app target
  if (defaultTargetName) {
    const found = allTargets.find(
      (t) =>
        t.props.name === defaultTargetName ||
        t.props.productName === defaultTargetName
    );
    if (found) return [found];
  }

  // Fall back to main app target
  const mainTarget = project.rootObject.getMainAppTarget("ios");
  if (mainTarget) return [mainTarget];

  // Last resort: first native target
  if (allTargets.length > 0) return [allTargets[0]];

  throw new Error(
    "[spm] No native targets found in Xcode project"
  );
}

/**
 * Link specific product names from a package to a target.
 */
function linkProductsToTarget(
  project: XcodeProject,
  target: PBXNativeTarget,
  products: string[],
  packageRef:
    | XCRemoteSwiftPackageReference
    | XCLocalSwiftPackageReference
): void {
  if (!target.props.packageProductDependencies) {
    target.props.packageProductDependencies = [];
  }

  for (const productName of products) {
    // Check for existing product dependency
    const existing = findExistingProductDependency(
      target,
      productName,
      packageRef
    );

    if (existing) {
      debug(
        "Product dependency already exists: %s on %s",
        productName,
        target.props.name
      );
      continue;
    }

    const productDep = XCSwiftPackageProductDependency.create(project, {
      package: packageRef,
      productName,
    });

    target.props.packageProductDependencies.push(productDep);
    debug(
      "Linked product %s to target %s",
      productName,
      target.props.name
    );

    // Also add to the frameworks build phase
    const frameworksPhase = target.getFrameworksBuildPhase();
    const { PBXBuildFile } = require("@bacons/xcode");
    const buildFile = PBXBuildFile.create(project, {
      productRef: productDep,
    });
    frameworksPhase.props.files.push(buildFile);
  }
}

/**
 * Convert our SwiftPackageRequirement into the Xcode pbxproj format.
 */
export function convertRequirementToXcodeFormat(
  req: SwiftPackageRequirement
): Record<string, string> {
  switch (req.kind) {
    case "upToNextMajorVersion":
      return {
        kind: "upToNextMajorVersion",
        minimumVersion: req.minimumVersion,
      };
    case "upToNextMinorVersion":
      return {
        kind: "upToNextMinorVersion",
        minimumVersion: req.minimumVersion,
      };
    case "exact":
      return {
        kind: "exactVersion",
        version: req.version,
      };
    case "range":
      return {
        kind: "versionRange",
        minimumVersion: req.minimumVersion,
        maximumVersion: req.maximumVersion,
      };
    case "branch":
      return {
        kind: "branch",
        branch: req.branch,
      };
    case "revision":
      return {
        kind: "revision",
        revision: req.revision,
      };
    case "latest":
      return {
        kind: "upToNextMajorVersion",
        minimumVersion: "0.0.1",
      };
  }
}

/**
 * Find an existing remote package reference by repository URL.
 */
export function findExistingRemotePackageReference(
  project: XcodeProject,
  url: string
): XCRemoteSwiftPackageReference | undefined {
  const refs = project.rootObject.props.packageReferences ?? [];
  return refs.find(
    (ref): ref is XCRemoteSwiftPackageReference =>
      XCRemoteSwiftPackageReference.is(ref) &&
      normalizeURL(ref.props.repositoryURL) === normalizeURL(url)
  );
}

/**
 * Find an existing local package reference by path.
 */
export function findExistingLocalPackageReference(
  project: XcodeProject,
  path: string
): XCLocalSwiftPackageReference | undefined {
  const refs = project.rootObject.props.packageReferences ?? [];
  return refs.find(
    (ref): ref is XCLocalSwiftPackageReference =>
      XCLocalSwiftPackageReference.is(ref) &&
      ref.props.path === path
  );
}

/**
 * Find an existing product dependency on a target.
 */
export function findExistingProductDependency(
  target: PBXNativeTarget,
  productName: string,
  packageRef:
    | XCRemoteSwiftPackageReference
    | XCLocalSwiftPackageReference
): XCSwiftPackageProductDependency | undefined {
  const deps = target.props.packageProductDependencies ?? [];
  return deps.find(
    (dep): dep is XCSwiftPackageProductDependency =>
      XCSwiftPackageProductDependency.is(dep) &&
      dep.props.productName === productName &&
      dep.props.package === packageRef
  );
}

/**
 * Remove a Swift package from the Xcode project by URL.
 * Removes the package reference and all product dependencies from all targets.
 */
export function removeSwiftPackageFromXcodeProject(
  project: XcodeProject,
  url: string
): boolean {
  const packageRef = findExistingRemotePackageReference(project, url);
  if (!packageRef) return false;

  // Remove product dependencies from all targets
  for (const target of project.rootObject.props.targets) {
    if (!PBXNativeTarget.is(target)) continue;
    if (!target.props.packageProductDependencies) continue;

    target.props.packageProductDependencies =
      target.props.packageProductDependencies.filter((dep) => {
        if (
          XCSwiftPackageProductDependency.is(dep) &&
          dep.props.package === packageRef
        ) {
          dep.removeFromProject();
          return false;
        }
        return true;
      });
  }

  // Remove package reference from project
  if (project.rootObject.props.packageReferences) {
    project.rootObject.props.packageReferences =
      project.rootObject.props.packageReferences.filter(
        (ref) => ref !== packageRef
      );
  }

  packageRef.removeFromProject();
  return true;
}

/**
 * List all Swift packages currently in the project.
 */
export function listSwiftPackagesInProject(
  project: XcodeProject
): Array<{
  url?: string;
  path?: string;
  isLocal: boolean;
  products: string[];
}> {
  const refs = project.rootObject.props.packageReferences ?? [];
  const result: Array<{
    url?: string;
    path?: string;
    isLocal: boolean;
    products: string[];
  }> = [];

  for (const ref of refs) {
    const products: string[] = [];

    // Find all product dependencies for this package reference
    for (const target of project.rootObject.props.targets) {
      if (!PBXNativeTarget.is(target)) continue;
      for (const dep of target.props.packageProductDependencies ?? []) {
        if (
          XCSwiftPackageProductDependency.is(dep) &&
          dep.props.package === ref
        ) {
          if (dep.props.productName) {
            products.push(dep.props.productName);
          }
        }
      }
    }

    if (XCRemoteSwiftPackageReference.is(ref)) {
      result.push({
        url: ref.props.repositoryURL,
        isLocal: false,
        products,
      });
    } else if (XCLocalSwiftPackageReference.is(ref)) {
      result.push({
        path: ref.props.path,
        isLocal: true,
        products,
      });
    }
  }

  return result;
}

/** Normalize a URL for comparison (strip trailing .git, lowercase). */
function normalizeURL(url: string): string {
  return url.replace(/\.git$/, "").toLowerCase();
}
