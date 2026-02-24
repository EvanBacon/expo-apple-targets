import {
  PBXNativeTarget,
  XCRemoteSwiftPackageReference,
  XCLocalSwiftPackageReference,
  XCSwiftPackageProductDependency,
  XcodeProject,
} from "@bacons/xcode";
import * as xcodeParse from "@bacons/xcode/json";
import fs from "fs";
import os from "os";
import path from "path";

import {
  addSwiftPackagesToXcodeProject,
  convertRequirementToXcodeFormat,
  findExistingRemotePackageReference,
  findExistingLocalPackageReference,
  findExistingProductDependency,
  removeSwiftPackageFromXcodeProject,
  listSwiftPackagesInProject,
} from "../xcode";

/**
 * Minimal .pbxproj content that represents a valid Xcode project
 * with a single main app target. This is the smallest valid project
 * we can construct for testing.
 */
function createMinimalPbxproj(appName: string = "TestApp"): string {
  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {
		13B07F951A680F5B00A75B9A /* ${appName} */ = {
			isa = PBXGroup;
			children = (
			);
			name = ${appName};
			sourceTree = "<group>";
		};
		83CBB9F61A601CBA00E9B192 /* Products */ = {
			isa = PBXGroup;
			children = (
				13B07F961A680F5B00A75B9A /* ${appName}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
		13B07F961A680F5B00A75B9A /* ${appName}.app */ = {
			isa = PBXFileReference;
			explicitFileType = wrapper.application;
			includeInIndex = 0;
			path = "${appName}.app";
			sourceTree = BUILT_PRODUCTS_DIR;
		};
		83CBB9F71A601CBA00E9B192 = {
			isa = PBXGroup;
			children = (
				13B07F951A680F5B00A75B9A /* ${appName} */,
				83CBB9F61A601CBA00E9B192 /* Products */,
			);
			sourceTree = "<group>";
		};
		13B07F861A680F5B00A75B9A /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
		13B07F8C1A680F5B00A75B9A /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
		13B07F8E1A680F5B00A75B9A /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
		13B07F9D1A680F5B00A75B9A /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				PRODUCT_BUNDLE_IDENTIFIER = "com.test.app";
				PRODUCT_NAME = "${appName}";
				INFOPLIST_FILE = "${appName}/Info.plist";
				SDKROOT = iphoneos;
			};
			name = Debug;
		};
		13B07F9E1A680F5B00A75B9A /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				PRODUCT_BUNDLE_IDENTIFIER = "com.test.app";
				PRODUCT_NAME = "${appName}";
				INFOPLIST_FILE = "${appName}/Info.plist";
				SDKROOT = iphoneos;
			};
			name = Release;
		};
		13B07F9F1A680F5B00A75B9A /* Build configuration list for PBXNativeTarget "${appName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				13B07F9D1A680F5B00A75B9A /* Debug */,
				13B07F9E1A680F5B00A75B9A /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		83CBB9FA1A601CBA00E9B192 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
			};
			name = Debug;
		};
		83CBB9FB1A601CBA00E9B192 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
			};
			name = Release;
		};
		83CBB9FC1A601CBA00E9B192 /* Build configuration list for PBXProject "TestProject" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				83CBB9FA1A601CBA00E9B192 /* Debug */,
				83CBB9FB1A601CBA00E9B192 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		13B07F8A1A680F5B00A75B9A /* ${appName} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 13B07F9F1A680F5B00A75B9A /* Build configuration list for PBXNativeTarget "${appName}" */;
			buildPhases = (
				13B07F861A680F5B00A75B9A /* Sources */,
				13B07F8C1A680F5B00A75B9A /* Frameworks */,
				13B07F8E1A680F5B00A75B9A /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = ${appName};
			productName = ${appName};
			productReference = 13B07F961A680F5B00A75B9A /* ${appName}.app */;
			productType = "com.apple.product-type.application";
		};
		83CBB9F51A601CBA00E9B192 /* Project object */ = {
			isa = PBXProject;
			buildConfigurationList = 83CBB9FC1A601CBA00E9B192 /* Build configuration list for PBXProject "TestProject" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 83CBB9F71A601CBA00E9B192;
			productRefGroup = 83CBB9F61A601CBA00E9B192 /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				13B07F8A1A680F5B00A75B9A /* ${appName} */,
			);
		};
	};
	rootObject = 83CBB9F51A601CBA00E9B192 /* Project object */;
}
`;
}

let tmpCounter = 0;

function createProject(appName?: string): XcodeProject {
  const pbxproj = createMinimalPbxproj(appName);
  // XcodeProject.open() requires a real file path, so write to a temp file
  const tmpDir = path.join(
    os.tmpdir(),
    `spm-test-${process.pid}-${++tmpCounter}.xcodeproj`
  );
  fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, "project.pbxproj");
  fs.writeFileSync(filePath, pbxproj);
  return XcodeProject.open(filePath);
}

function getMainTarget(project: XcodeProject): PBXNativeTarget {
  const target = project.rootObject.getMainAppTarget("ios");
  if (!target) throw new Error("No main app target found");
  return target;
}

describe("convertRequirementToXcodeFormat", () => {
  it("converts upToNextMajorVersion", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "upToNextMajorVersion",
      minimumVersion: "1.2.3",
    });
    expect(result).toEqual({
      kind: "upToNextMajorVersion",
      minimumVersion: "1.2.3",
    });
  });

  it("converts upToNextMinorVersion", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "upToNextMinorVersion",
      minimumVersion: "5.9.0",
    });
    expect(result).toEqual({
      kind: "upToNextMinorVersion",
      minimumVersion: "5.9.0",
    });
  });

  it("converts exact to exactVersion", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "exact",
      version: "1.0.0",
    });
    expect(result).toEqual({
      kind: "exactVersion",
      version: "1.0.0",
    });
  });

  it("converts range to versionRange", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "range",
      minimumVersion: "1.0.0",
      maximumVersion: "2.0.0",
    });
    expect(result).toEqual({
      kind: "versionRange",
      minimumVersion: "1.0.0",
      maximumVersion: "2.0.0",
    });
  });

  it("converts branch", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "branch",
      branch: "develop",
    });
    expect(result).toEqual({
      kind: "branch",
      branch: "develop",
    });
  });

  it("converts revision", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "revision",
      revision: "abc123",
    });
    expect(result).toEqual({
      kind: "revision",
      revision: "abc123",
    });
  });

  it("converts latest to upToNextMajorVersion with 0.0.1", () => {
    const result = convertRequirementToXcodeFormat({
      kind: "latest",
    });
    expect(result).toEqual({
      kind: "upToNextMajorVersion",
      minimumVersion: "0.0.1",
    });
  });
});

describe("addSwiftPackagesToXcodeProject", () => {
  describe("remote packages", () => {
    it("adds a single remote package with one product", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "alamofire",
          url: "https://github.com/Alamofire/Alamofire.git",
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "5.9.0",
          },
          products: ["Alamofire"],
          isLocal: false,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      // Verify package reference was added
      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(1);
      expect(XCRemoteSwiftPackageReference.is(refs[0])).toBe(true);
      const remoteRef = refs[0] as XCRemoteSwiftPackageReference;
      expect(remoteRef.props.repositoryURL).toBe(
        "https://github.com/Alamofire/Alamofire.git"
      );
      expect(remoteRef.props.requirement).toEqual({
        kind: "upToNextMajorVersion",
        minimumVersion: "5.9.0",
      });

      // Verify product dependency was added to main target
      const target = getMainTarget(project);
      const deps = target.props.packageProductDependencies ?? [];
      expect(deps).toHaveLength(1);
      expect(XCSwiftPackageProductDependency.is(deps[0])).toBe(true);
      const dep = deps[0] as XCSwiftPackageProductDependency;
      expect(dep.props.productName).toBe("Alamofire");
      expect(dep.props.package).toBe(remoteRef);
    });

    it("adds a package with multiple products", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "firebase",
          url: "https://github.com/firebase/firebase-ios-sdk.git",
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "11.0.0",
          },
          products: ["FirebaseAuth", "FirebaseFirestore", "FirebaseMessaging"],
          isLocal: false,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(1);

      const target = getMainTarget(project);
      const deps = target.props.packageProductDependencies ?? [];
      expect(deps).toHaveLength(3);

      const productNames = deps.map((d: any) => d.props.productName);
      expect(productNames).toEqual([
        "FirebaseAuth",
        "FirebaseFirestore",
        "FirebaseMessaging",
      ]);

      // All product deps should reference the same package
      const packageRefs = deps.map((d: any) => d.props.package);
      expect(new Set(packageRefs).size).toBe(1);
    });

    it("adds multiple different remote packages", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "alamofire",
          url: "https://github.com/Alamofire/Alamofire.git",
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "5.9.0",
          },
          products: ["Alamofire"],
          isLocal: false,
        },
        {
          identifier: "snapkit",
          url: "https://github.com/SnapKit/SnapKit.git",
          requirement: { kind: "exact", version: "5.7.1" },
          products: ["SnapKit"],
          isLocal: false,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(2);

      const target = getMainTarget(project);
      const deps = target.props.packageProductDependencies ?? [];
      expect(deps).toHaveLength(2);
    });

    it("deduplicates package references with same URL", () => {
      const project = createProject();

      // Add the same package twice
      const packages: ResolvedPackage[] = [
        {
          identifier: "alamofire",
          url: "https://github.com/Alamofire/Alamofire.git",
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "5.9.0",
          },
          products: ["Alamofire"],
          isLocal: false,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);
      addSwiftPackagesToXcodeProject(project, packages);

      // Should only have one package reference
      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(1);

      // Should only have one product dependency (deduped)
      const target = getMainTarget(project);
      const deps = target.props.packageProductDependencies ?? [];
      expect(deps).toHaveLength(1);
    });

    it("handles branch requirement", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "my-pkg",
          url: "https://github.com/owner/repo.git",
          requirement: { kind: "branch", branch: "develop" },
          products: ["MyLib"],
          isLocal: false,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      const remoteRef = refs[0] as XCRemoteSwiftPackageReference;
      expect(remoteRef.props.requirement).toEqual({
        kind: "branch",
        branch: "develop",
      });
    });

    it("handles revision requirement", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "my-pkg",
          url: "https://github.com/owner/repo.git",
          requirement: { kind: "revision", revision: "abc123" },
          products: ["MyLib"],
          isLocal: false,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      const remoteRef = refs[0] as XCRemoteSwiftPackageReference;
      expect(remoteRef.props.requirement).toEqual({
        kind: "revision",
        revision: "abc123",
      });
    });

    it("throws when remote package has no URL", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "bad-pkg",
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "1.0.0",
          },
          products: ["BadLib"],
          isLocal: false,
        },
      ];

      expect(() =>
        addSwiftPackagesToXcodeProject(project, packages)
      ).toThrow(/must have a URL/);
    });
  });

  describe("local packages", () => {
    it("adds a local package", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "local-lib",
          path: "../LocalLib",
          requirement: { kind: "exact", version: "0.0.0" },
          products: ["LocalLib"],
          isLocal: true,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(1);
      expect(XCLocalSwiftPackageReference.is(refs[0])).toBe(true);
      const localRef = refs[0] as XCLocalSwiftPackageReference;
      expect(localRef.props.path).toBe("../LocalLib");

      const target = getMainTarget(project);
      const deps = target.props.packageProductDependencies ?? [];
      expect(deps).toHaveLength(1);
      expect((deps[0] as XCSwiftPackageProductDependency).props.productName).toBe("LocalLib");
    });

    it("deduplicates local package references with same path", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "local-lib",
          path: "../LocalLib",
          requirement: { kind: "exact", version: "0.0.0" },
          products: ["LocalLib"],
          isLocal: true,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);
      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(1);
    });

    it("throws when local package has no path", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "bad-local",
          requirement: { kind: "exact", version: "0.0.0" },
          products: ["BadLib"],
          isLocal: true,
        },
      ];

      expect(() =>
        addSwiftPackagesToXcodeProject(project, packages)
      ).toThrow(/must have a path/);
    });
  });

  describe("mixed packages", () => {
    it("adds both remote and local packages", () => {
      const project = createProject();
      const packages: ResolvedPackage[] = [
        {
          identifier: "alamofire",
          url: "https://github.com/Alamofire/Alamofire.git",
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "5.9.0",
          },
          products: ["Alamofire"],
          isLocal: false,
        },
        {
          identifier: "local-lib",
          path: "../LocalLib",
          requirement: { kind: "exact", version: "0.0.0" },
          products: ["LocalLib"],
          isLocal: true,
        },
      ];

      addSwiftPackagesToXcodeProject(project, packages);

      const refs = project.rootObject.props.packageReferences ?? [];
      expect(refs).toHaveLength(2);

      const remoteRefs = refs.filter((r) =>
        XCRemoteSwiftPackageReference.is(r)
      );
      const localRefs = refs.filter((r) =>
        XCLocalSwiftPackageReference.is(r)
      );
      expect(remoteRefs).toHaveLength(1);
      expect(localRefs).toHaveLength(1);

      const target = getMainTarget(project);
      const deps = target.props.packageProductDependencies ?? [];
      expect(deps).toHaveLength(2);
    });
  });
});

describe("findExistingRemotePackageReference", () => {
  it("finds package by exact URL", () => {
    const project = createProject();
    const ref = XCRemoteSwiftPackageReference.create(project, {
      repositoryURL: "https://github.com/Alamofire/Alamofire.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "5.0.0" },
    });
    project.rootObject.props.packageReferences = [ref];

    const found = findExistingRemotePackageReference(
      project,
      "https://github.com/Alamofire/Alamofire.git"
    );
    expect(found).toBe(ref);
  });

  it("finds package ignoring .git suffix differences", () => {
    const project = createProject();
    const ref = XCRemoteSwiftPackageReference.create(project, {
      repositoryURL: "https://github.com/Alamofire/Alamofire.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "5.0.0" },
    });
    project.rootObject.props.packageReferences = [ref];

    const found = findExistingRemotePackageReference(
      project,
      "https://github.com/Alamofire/Alamofire"
    );
    expect(found).toBe(ref);
  });

  it("finds package case-insensitively", () => {
    const project = createProject();
    const ref = XCRemoteSwiftPackageReference.create(project, {
      repositoryURL: "https://github.com/Alamofire/Alamofire.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "5.0.0" },
    });
    project.rootObject.props.packageReferences = [ref];

    const found = findExistingRemotePackageReference(
      project,
      "https://github.com/alamofire/alamofire.git"
    );
    expect(found).toBe(ref);
  });

  it("returns undefined when not found", () => {
    const project = createProject();
    project.rootObject.props.packageReferences = [];

    const found = findExistingRemotePackageReference(
      project,
      "https://github.com/nonexistent/package.git"
    );
    expect(found).toBeUndefined();
  });

  it("returns undefined when packageReferences is empty", () => {
    const project = createProject();
    // No packageReferences property at all

    const found = findExistingRemotePackageReference(
      project,
      "https://github.com/Alamofire/Alamofire.git"
    );
    expect(found).toBeUndefined();
  });
});

describe("findExistingLocalPackageReference", () => {
  it("finds local package by exact path", () => {
    const project = createProject();
    const ref = XCLocalSwiftPackageReference.create(project, {
      path: "../MyLocalPackage",
    });
    project.rootObject.props.packageReferences = [ref];

    const found = findExistingLocalPackageReference(
      project,
      "../MyLocalPackage"
    );
    expect(found).toBe(ref);
  });

  it("returns undefined for non-matching path", () => {
    const project = createProject();
    const ref = XCLocalSwiftPackageReference.create(project, {
      path: "../MyLocalPackage",
    });
    project.rootObject.props.packageReferences = [ref];

    const found = findExistingLocalPackageReference(
      project,
      "../OtherPackage"
    );
    expect(found).toBeUndefined();
  });
});

describe("removeSwiftPackageFromXcodeProject", () => {
  it("removes a package and its product dependencies", () => {
    const project = createProject();
    const url = "https://github.com/Alamofire/Alamofire.git";

    // Add the package first
    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "alamofire",
        url,
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "5.9.0",
        },
        products: ["Alamofire"],
        isLocal: false,
      },
    ]);

    expect(project.rootObject.props.packageReferences).toHaveLength(1);
    const target = getMainTarget(project);
    expect(target.props.packageProductDependencies).toHaveLength(1);

    // Remove it
    const removed = removeSwiftPackageFromXcodeProject(project, url);
    expect(removed).toBe(true);

    expect(project.rootObject.props.packageReferences).toHaveLength(0);
    expect(target.props.packageProductDependencies).toHaveLength(0);
  });

  it("returns false when package not found", () => {
    const project = createProject();
    const removed = removeSwiftPackageFromXcodeProject(
      project,
      "https://github.com/nonexistent/package.git"
    );
    expect(removed).toBe(false);
  });

  it("only removes the specified package, not others", () => {
    const project = createProject();

    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "alamofire",
        url: "https://github.com/Alamofire/Alamofire.git",
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "5.9.0",
        },
        products: ["Alamofire"],
        isLocal: false,
      },
      {
        identifier: "snapkit",
        url: "https://github.com/SnapKit/SnapKit.git",
        requirement: { kind: "exact", version: "5.7.1" },
        products: ["SnapKit"],
        isLocal: false,
      },
    ]);

    expect(project.rootObject.props.packageReferences).toHaveLength(2);

    removeSwiftPackageFromXcodeProject(
      project,
      "https://github.com/Alamofire/Alamofire.git"
    );

    expect(project.rootObject.props.packageReferences).toHaveLength(1);
    const remaining = project.rootObject.props
      .packageReferences![0] as XCRemoteSwiftPackageReference;
    expect(remaining.props.repositoryURL).toBe(
      "https://github.com/SnapKit/SnapKit.git"
    );
  });
});

describe("listSwiftPackagesInProject", () => {
  it("returns empty array for project with no packages", () => {
    const project = createProject();
    expect(listSwiftPackagesInProject(project)).toEqual([]);
  });

  it("lists remote packages with their products", () => {
    const project = createProject();
    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "alamofire",
        url: "https://github.com/Alamofire/Alamofire.git",
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "5.9.0",
        },
        products: ["Alamofire"],
        isLocal: false,
      },
    ]);

    const packages = listSwiftPackagesInProject(project);
    expect(packages).toHaveLength(1);
    expect(packages[0]).toEqual({
      url: "https://github.com/Alamofire/Alamofire.git",
      isLocal: false,
      products: ["Alamofire"],
    });
  });

  it("lists local packages with their products", () => {
    const project = createProject();
    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "local-lib",
        path: "../LocalLib",
        requirement: { kind: "exact", version: "0.0.0" },
        products: ["LocalLib"],
        isLocal: true,
      },
    ]);

    const packages = listSwiftPackagesInProject(project);
    expect(packages).toHaveLength(1);
    expect(packages[0]).toEqual({
      path: "../LocalLib",
      isLocal: true,
      products: ["LocalLib"],
    });
  });

  it("lists multiple packages with multiple products", () => {
    const project = createProject();
    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "firebase",
        url: "https://github.com/firebase/firebase-ios-sdk.git",
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "11.0.0",
        },
        products: ["FirebaseAuth", "FirebaseFirestore"],
        isLocal: false,
      },
      {
        identifier: "local-lib",
        path: "../LocalLib",
        requirement: { kind: "exact", version: "0.0.0" },
        products: ["LocalLib"],
        isLocal: true,
      },
    ]);

    const packages = listSwiftPackagesInProject(project);
    expect(packages).toHaveLength(2);

    const firebasePkg = packages.find(
      (p) => p.url === "https://github.com/firebase/firebase-ios-sdk.git"
    );
    expect(firebasePkg).toBeDefined();
    expect(firebasePkg!.products).toEqual([
      "FirebaseAuth",
      "FirebaseFirestore",
    ]);

    const localPkg = packages.find((p) => p.path === "../LocalLib");
    expect(localPkg).toBeDefined();
    expect(localPkg!.products).toEqual(["LocalLib"]);
  });
});

describe("serialization roundtrip", () => {
  it("preserves SPM data through project serialize/deserialize", () => {
    const project = createProject();

    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "alamofire",
        url: "https://github.com/Alamofire/Alamofire.git",
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "5.9.0",
        },
        products: ["Alamofire"],
        isLocal: false,
      },
    ]);

    // Serialize to string and re-open from a temp file
    const jsonData = project.toJSON();
    const pbxprojString = xcodeParse.build(jsonData);
    const tmpDir2 = path.join(
      os.tmpdir(),
      `spm-roundtrip-${process.pid}-${++tmpCounter}.xcodeproj`
    );
    fs.mkdirSync(tmpDir2, { recursive: true });
    const tmpPath = path.join(tmpDir2, "project.pbxproj");
    fs.writeFileSync(tmpPath, pbxprojString);
    const reparsedProject = XcodeProject.open(tmpPath);

    // Verify package references survived the roundtrip
    const refs = reparsedProject.rootObject.props.packageReferences ?? [];
    expect(refs).toHaveLength(1);
    expect(XCRemoteSwiftPackageReference.is(refs[0])).toBe(true);

    const remoteRef = refs[0] as XCRemoteSwiftPackageReference;
    expect(remoteRef.props.repositoryURL).toBe(
      "https://github.com/Alamofire/Alamofire.git"
    );
    expect(remoteRef.props.requirement).toEqual({
      kind: "upToNextMajorVersion",
      minimumVersion: "5.9.0",
    });

    // Verify product dependencies survived
    const target = reparsedProject.rootObject.getMainAppTarget("ios")!;
    const deps = target.props.packageProductDependencies ?? [];
    expect(deps).toHaveLength(1);
    expect(
      (deps[0] as XCSwiftPackageProductDependency).props.productName
    ).toBe("Alamofire");
  });

  it("preserves multiple packages through roundtrip", () => {
    const project = createProject();

    addSwiftPackagesToXcodeProject(project, [
      {
        identifier: "alamofire",
        url: "https://github.com/Alamofire/Alamofire.git",
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "5.9.0",
        },
        products: ["Alamofire"],
        isLocal: false,
      },
      {
        identifier: "firebase",
        url: "https://github.com/firebase/firebase-ios-sdk.git",
        requirement: {
          kind: "upToNextMajorVersion",
          minimumVersion: "11.0.0",
        },
        products: ["FirebaseAuth", "FirebaseFirestore"],
        isLocal: false,
      },
    ]);

    const jsonData2 = project.toJSON();
    const pbxprojString2 = xcodeParse.build(jsonData2);
    const tmpDir3 = path.join(
      os.tmpdir(),
      `spm-roundtrip-${process.pid}-${++tmpCounter}.xcodeproj`
    );
    fs.mkdirSync(tmpDir3, { recursive: true });
    const tmpPath2 = path.join(tmpDir3, "project.pbxproj");
    fs.writeFileSync(tmpPath2, pbxprojString2);
    const reparsedProject = XcodeProject.open(tmpPath2);

    const refs = reparsedProject.rootObject.props.packageReferences ?? [];
    expect(refs).toHaveLength(2);

    const target = reparsedProject.rootObject.getMainAppTarget("ios")!;
    const deps = target.props.packageProductDependencies ?? [];
    expect(deps).toHaveLength(3); // 1 + 2 products
  });
});
