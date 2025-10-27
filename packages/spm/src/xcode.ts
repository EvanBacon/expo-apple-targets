/**
 * Xcode project manipulation for Swift Package Manager
 * Adds package references and product dependencies to Xcode projects
 */

import {
  XcodeProject,
  XCRemoteSwiftPackageReference,
  XCLocalSwiftPackageReference,
  XCSwiftPackageProductDependency,
  PBXNativeTarget,
} from "@bacons/xcode";
import { ResolvedPackage, SwiftPackageRequirement } from "./types";

/**
 * Convert our SwiftPackageRequirement to the format expected by @bacons/xcode
 */
function convertRequirementToXcodeFormat(
  requirement: SwiftPackageRequirement
): any {
  switch (requirement.kind) {
    case "upToNextMajorVersion":
      return {
        kind: "upToNextMajorVersion",
        minimumVersion: requirement.minimumVersion,
      };

    case "upToNextMinorVersion":
      return {
        kind: "upToNextMinorVersion",
        minimumVersion: requirement.minimumVersion,
      };

    case "exact":
      return {
        kind: "exactVersion",
        version: requirement.version,
      };

    case "range":
      return {
        kind: "versionRange",
        minimumVersion: requirement.minimumVersion,
        maximumVersion: requirement.maximumVersion,
      };

    case "branch":
      return {
        kind: "branch",
        branch: requirement.branch,
      };

    case "revision":
      return {
        kind: "revision",
        revision: requirement.revision,
      };

    case "latest":
      // For latest, we use upToNextMajor with a low version
      // This will get the latest version available
      return {
        kind: "upToNextMajorVersion",
        minimumVersion: "0.0.1",
      };
  }
}

/**
 * Add Swift package dependencies to an Xcode project
 *
 * @param project The Xcode project to modify
 * @param packages Array of resolved packages to add
 * @param targetName Name of the target to link products to (usually main app target)
 */
export async function addSwiftPackagesToXcodeProject(
  project: XcodeProject,
  packages: ResolvedPackage[]
): Promise<void> {
  // Find the main app target
  const mainTarget = project.rootObject.getMainAppTarget();

  if (!mainTarget) {
    throw new Error(`Unable to find main app target in Xcode project`);
  }

  // Process each package
  for (const pkg of packages) {
    if (pkg.isLocal) {
      // Add local package reference
      await addLocalPackageReference(project, pkg, mainTarget);
    } else {
      // Add remote package reference
      await addRemotePackageReference(project, pkg, mainTarget);
    }
  }
}

/**
 * Add a remote Swift package reference to the project
 */
async function addRemotePackageReference(
  project: XcodeProject,
  pkg: ResolvedPackage,
  target: PBXNativeTarget
): Promise<void> {
  // Check if package reference already exists
  const existingRef = findExistingRemotePackageReference(project, pkg.url);

  let packageRef: XCRemoteSwiftPackageReference;

  if (existingRef) {
    // Update existing reference
    packageRef = existingRef;
    console.log(`Updating existing package reference: ${pkg.identifier}`);
  } else {
    // Create new package reference
    console.log(`Adding package reference: ${pkg.identifier} (${pkg.url})`);

    packageRef = XCRemoteSwiftPackageReference.create(project, {
      repositoryURL: pkg.url,
      requirement: convertRequirementToXcodeFormat(pkg.requirement),
    });

    // Add to project's package references
    if (!project.rootObject.props.packageReferences) {
      project.rootObject.props.packageReferences = [];
    }
    project.rootObject.props.packageReferences.push(packageRef);
  }

  // Add product dependencies to target
  for (const productName of pkg.products) {
    addProductDependencyToTarget(project, target, packageRef, productName);
  }
}

/**
 * Add a local Swift package reference to the project
 */
async function addLocalPackageReference(
  project: XcodeProject,
  pkg: ResolvedPackage,
  target: PBXNativeTarget
): Promise<void> {
  if (!pkg.path) {
    throw new Error(`Local package ${pkg.identifier} is missing path`);
  }

  // Check if package reference already exists
  const existingRef = findExistingLocalPackageReference(project, pkg.path);

  let packageRef: XCLocalSwiftPackageReference;

  if (existingRef) {
    packageRef = existingRef;
    console.log(`Updating existing local package: ${pkg.identifier}`);
  } else {
    console.log(`Adding local package: ${pkg.identifier} (${pkg.path})`);

    packageRef = XCLocalSwiftPackageReference.create(project, {
      path: pkg.path!,
      relativePath: pkg.path!,
    });

    // Add to project's package references
    if (!project.rootObject.props.packageReferences) {
      project.rootObject.props.packageReferences = [];
    }
    project.rootObject.props.packageReferences.push(packageRef);
  }

  // Add product dependencies to target
  for (const productName of pkg.products) {
    addProductDependencyToTarget(project, target, packageRef, productName);
  }
}

/**
 * Add a product dependency to a target
 */
function addProductDependencyToTarget(
  project: XcodeProject,
  target: PBXNativeTarget,
  packageRef: XCRemoteSwiftPackageReference | XCLocalSwiftPackageReference,
  productName: string
): void {
  // Check if product dependency already exists
  const existingDep = findExistingProductDependency(target, productName);

  if (existingDep) {
    console.log(`Product "${productName}" already linked to target`);
    return;
  }

  console.log(
    `Linking product "${productName}" to target "${target.props.name}"`
  );

  // Create product dependency
  const productDep = XCSwiftPackageProductDependency.create(project, {
    productName,
    package: packageRef,
  });

  // Add to target's package product dependencies
  if (!target.props.packageProductDependencies) {
    target.props.packageProductDependencies = [];
  }
  target.props.packageProductDependencies.push(productDep);
}

/**
 * Find existing remote package reference by URL
 */
function findExistingRemotePackageReference(
  project: XcodeProject,
  url: string
): XCRemoteSwiftPackageReference | null {
  if (!project.rootObject.props.packageReferences) {
    return null;
  }

  for (const ref of project.rootObject.props.packageReferences) {
    if (
      XCRemoteSwiftPackageReference.is(ref) &&
      ref.props.repositoryURL === url
    ) {
      return ref;
    }
  }

  return null;
}

/**
 * Find existing local package reference by path
 */
function findExistingLocalPackageReference(
  project: XcodeProject,
  path: string
): XCLocalSwiftPackageReference | null {
  if (!project.rootObject.props.packageReferences) {
    return null;
  }

  for (const ref of project.rootObject.props.packageReferences) {
    if (XCLocalSwiftPackageReference.is(ref) && ref.props.path === path) {
      return ref;
    }
  }

  return null;
}

/**
 * Find existing product dependency by product name
 */
function findExistingProductDependency(
  target: PBXNativeTarget,
  productName: string
): XCSwiftPackageProductDependency | null {
  if (!target.props.packageProductDependencies) {
    return null;
  }

  for (const dep of target.props.packageProductDependencies) {
    if (
      XCSwiftPackageProductDependency.is(dep) &&
      dep.props.productName === productName
    ) {
      return dep;
    }
  }

  return null;
}

/**
 * Remove a Swift package from the Xcode project
 * Useful for cleanup or updates
 */
export function removeSwiftPackageFromXcodeProject(
  project: XcodeProject,
  packageUrl: string
): void {
  if (!project.rootObject.props.packageReferences) {
    return;
  }

  // Find and remove the package reference
  const index = project.rootObject.props.packageReferences.findIndex(
    (ref) =>
      XCRemoteSwiftPackageReference.is(ref) &&
      ref.props.repositoryURL === packageUrl
  );

  if (index !== -1) {
    const packageRef = project.rootObject.props.packageReferences[index];

    // Remove product dependencies from all targets
    for (const target of project.rootObject.props.targets) {
      if (
        PBXNativeTarget.is(target) &&
        target.props.packageProductDependencies
      ) {
        target.props.packageProductDependencies =
          target.props.packageProductDependencies.filter(
            (dep) =>
              !(
                XCSwiftPackageProductDependency.is(dep) &&
                dep.props.package === packageRef
              )
          );
      }
    }

    // Remove the package reference
    project.rootObject.props.packageReferences.splice(index, 1);

    console.log(`Removed package: ${packageUrl}`);
  }
}

/**
 * List all Swift packages currently in the Xcode project
 */
export function listSwiftPackagesInProject(
  project: XcodeProject
): Array<{ url: string; products: string[] }> {
  const packages: Array<{ url: string; products: string[] }> = [];

  if (!project.rootObject.props.packageReferences) {
    return packages;
  }

  for (const ref of project.rootObject.props.packageReferences) {
    if (XCRemoteSwiftPackageReference.is(ref)) {
      const products: string[] = [];

      // Find all products from this package
      for (const target of project.rootObject.props.targets) {
        if (
          PBXNativeTarget.is(target) &&
          target.props.packageProductDependencies
        ) {
          for (const dep of target.props.packageProductDependencies) {
            if (
              XCSwiftPackageProductDependency.is(dep) &&
              dep.props.package === ref &&
              dep.props.productName
            ) {
              products.push(dep.props.productName);
            }
          }
        }
      }

      packages.push({
        url: ref.props.repositoryURL,
        products: [...new Set(products)], // Remove duplicates
      });
    }
  }

  return packages;
}
