import {
  PBXNativeTarget,
  XCRemoteSwiftPackageReference,
  XCSwiftPackageProductDependency,
  XcodeProject,
} from "@bacons/xcode";
import type { SwiftPackage } from "./config";

/**
 * Adds a Swift Package to the Xcode project's package references if it doesn't already exist.
 * Returns the existing or newly created package reference.
 */
export function addSwiftPackageToProject(
  project: XcodeProject,
  swiftPackage: SwiftPackage
): XCRemoteSwiftPackageReference {
  // Ensure packageReferences array exists on the project
  if (!project.rootObject.props.packageReferences) {
    project.rootObject.props.packageReferences = [];
  }

  // Check if package with this URL already exists
  const existingPackage = project.rootObject.props.packageReferences.find(
    (ref) => {
      if (XCRemoteSwiftPackageReference.is(ref)) {
        return ref.props.repositoryURL === swiftPackage.url;
      }
      return false;
    }
  );

  if (existingPackage && XCRemoteSwiftPackageReference.is(existingPackage)) {
    return existingPackage;
  }

  // Determine version requirement based on what's provided
  const requirement = createVersionRequirement(swiftPackage);

  // Create new package reference
  const packageRef = XCRemoteSwiftPackageReference.create(project, {
    repositoryURL: swiftPackage.url,
    requirement,
  });

  // Add to project's package references
  project.rootObject.props.packageReferences.push(packageRef);

  return packageRef;
}

/**
 * Creates the version requirement object based on the Swift package configuration.
 */
function createVersionRequirement(swiftPackage: SwiftPackage): any {
  if (swiftPackage.branch) {
    return {
      kind: "branch",
      branch: swiftPackage.branch,
    };
  }

  if (swiftPackage.commit) {
    return {
      kind: "revision",
      revision: swiftPackage.commit,
    };
  }

  if (swiftPackage.version) {
    const kind = swiftPackage.requirement || "upToNextMajorVersion";

    if (kind === "exactVersion") {
      return {
        kind: "exactVersion",
        version: swiftPackage.version,
      };
    } else if (kind === "upToNextMinorVersion") {
      return {
        kind: "upToNextMinorVersion",
        minimumVersion: swiftPackage.version,
      };
    } else if (kind === "versionRange") {
      // For range, we expect version to be in format "1.0.0-2.0.0"
      const [minimumVersion, maximumVersion] = swiftPackage.version.split("-");
      return {
        kind: "versionRange",
        minimumVersion,
        maximumVersion,
      };
    } else {
      // Default: upToNextMajorVersion
      return {
        kind: "upToNextMajorVersion",
        minimumVersion: swiftPackage.version,
      };
    }
  }

  // Default to upToNextMajorVersion with no version specified (shouldn't happen with validation)
  return {
    kind: "upToNextMajorVersion",
    minimumVersion: "1.0.0",
  };
}

/**
 * Links Swift Package products to a specific target.
 */
export function linkSwiftPackageProductsToTarget(
  project: XcodeProject,
  target: PBXNativeTarget,
  packageRef: XCRemoteSwiftPackageReference,
  products: string[]
): void {
  // Ensure packageProductDependencies array exists on the target
  if (!target.props.packageProductDependencies) {
    target.props.packageProductDependencies = [];
  }

  for (const productName of products) {
    // Check if this product is already linked to the target
    const existingDependency = target.props.packageProductDependencies.find(
      (dep) => {
        if (XCSwiftPackageProductDependency.is(dep)) {
          return (
            dep.props.productName === productName &&
            dep.props.package === packageRef
          );
        }
        return false;
      }
    );

    if (existingDependency) {
      // Product already linked, skip
      continue;
    }

    // Create product dependency
    const productDependency = XCSwiftPackageProductDependency.create(project, {
      package: packageRef,
      productName,
    });

    // Add to target's package product dependencies
    target.props.packageProductDependencies.push(productDependency);
  }
}

/**
 * Adds Swift Packages to the project and links them to the specified target.
 */
export function addSwiftPackagesToTarget(
  project: XcodeProject,
  target: PBXNativeTarget,
  swiftPackages: SwiftPackage[]
): void {
  if (!swiftPackages || swiftPackages.length === 0) {
    return;
  }

  for (const swiftPackage of swiftPackages) {
    // Validate package configuration
    if (!swiftPackage.url) {
      console.warn(
        `[bacons/apple-targets] Swift package missing URL, skipping: ${JSON.stringify(swiftPackage)}`
      );
      continue;
    }

    if (!swiftPackage.products || swiftPackage.products.length === 0) {
      console.warn(
        `[bacons/apple-targets] Swift package "${swiftPackage.url}" has no products specified, skipping`
      );
      continue;
    }

    // Add package to project (or get existing)
    const packageRef = addSwiftPackageToProject(project, swiftPackage);

    // Link products to target
    linkSwiftPackageProductsToTarget(
      project,
      target,
      packageRef,
      swiftPackage.products
    );
  }
}
