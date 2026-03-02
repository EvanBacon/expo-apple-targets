import {
  PBXNativeTarget,
  XCLocalSwiftPackageReference,
  XCRemoteSwiftPackageReference,
  XCSwiftPackageProductDependency,
  XcodeProject,
} from "@bacons/xcode";
import _debug from "debug";

import type { ResolvedPackage, SwiftPackageRequirement } from "./types";

/** Version requirement for a remote Swift package (mirrors @bacons/xcode internal type). */
type XCSwiftPackageVersionRequirement =
  | { kind: "upToNextMajorVersion"; minimumVersion: string }
  | { kind: "upToNextMinorVersion"; minimumVersion: string }
  | { kind: "versionRange"; minimumVersion: string; maximumVersion: string }
  | { kind: "exactVersion"; version: string }
  | { kind: "branch"; branch: string }
  | { kind: "revision"; revision: string };

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

  const requirement = convertRequirementToXcodeFormat(pkg.requirement);

  // Use the new helper method - handles deduplication internally
  const packageRef = project.rootObject.addRemoteSwiftPackage({
    repositoryURL: pkg.url,
    requirement,
  });

  debug("Package reference ready for: %s", pkg.url);

  // Link products to target(s)
  const targets = resolveTargets(project, pkg.targets, targetName);
  for (const target of targets) {
    linkProductsToTarget(target, pkg.products, packageRef);
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

  // Use the new helper method - handles deduplication internally
  const packageRef = project.rootObject.addLocalSwiftPackage({
    relativePath: pkg.path,
  });

  debug("Local package reference ready for: %s", pkg.path);

  const targets = resolveTargets(project, pkg.targets, targetName);
  for (const target of targets) {
    linkProductsToTarget(target, pkg.products, packageRef);
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
 * Uses the new addSwiftPackageProduct helper which handles:
 * - Creating product dependency
 * - Adding to target's packageProductDependencies
 * - Creating build file with productRef
 * - Adding to frameworks build phase
 */
function linkProductsToTarget(
  target: PBXNativeTarget,
  products: string[],
  packageRef:
    | XCRemoteSwiftPackageReference
    | XCLocalSwiftPackageReference
): void {
  for (const productName of products) {
    // Use the new helper method - handles deduplication and full wiring
    target.addSwiftPackageProduct({
      productName,
      package: packageRef,
    });

    debug(
      "Linked product %s to target %s",
      productName,
      target.props.name
    );
  }
}

/**
 * Convert our SwiftPackageRequirement into the Xcode pbxproj format.
 */
export function convertRequirementToXcodeFormat(
  req: SwiftPackageRequirement
): XCSwiftPackageVersionRequirement {
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
 * Normalize a repository URL for comparison.
 * - Removes trailing .git suffix
 * - Lowercases for case-insensitive matching
 */
function normalizeRepoUrl(url: string): string {
  return url.replace(/\.git$/, "").toLowerCase();
}

/**
 * Find an existing remote package reference by repository URL.
 * Matches URLs case-insensitively and ignores .git suffix differences.
 */
export function findExistingRemotePackageReference(
  project: XcodeProject,
  url: string
): XCRemoteSwiftPackageReference | undefined {
  const refs = project.rootObject.props.packageReferences ?? [];
  const normalizedUrl = normalizeRepoUrl(url);

  for (const ref of refs) {
    if (
      XCRemoteSwiftPackageReference.is(ref) &&
      normalizeRepoUrl(ref.props.repositoryURL ?? "") === normalizedUrl
    ) {
      return ref;
    }
  }
  return undefined;
}

/**
 * Find an existing local package reference by path.
 */
export function findExistingLocalPackageReference(
  project: XcodeProject,
  path: string
): XCLocalSwiftPackageReference | undefined {
  // Use the new helper method
  const ref = project.rootObject.getPackageReference(path);
  if (ref && XCLocalSwiftPackageReference.is(ref)) {
    return ref;
  }
  return undefined;
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

    // Use the new helper to get all package product dependencies
    const deps = target.getSwiftPackageProductDependencies?.() ??
      target.props.packageProductDependencies ?? [];

    for (const dep of deps) {
      if (
        XCSwiftPackageProductDependency.is(dep) &&
        dep.props.package === packageRef
      ) {
        // Use the new helper if available, otherwise manual cleanup
        if (target.removeSwiftPackageProduct) {
          target.removeSwiftPackageProduct(dep);
        } else {
          dep.removeFromProject();
        }
      }
    }
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
        path: ref.props.relativePath,
        isLocal: true,
        products,
      });
    }
  }

  return result;
}
