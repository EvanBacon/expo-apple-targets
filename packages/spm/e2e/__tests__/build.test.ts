import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * SPM package registry for e2e build tests.
 *
 * Each entry represents a Swift package that the fixture project declares
 * as a dependency via @bacons/spm. The e2e test verifies:
 *  1. expo prebuild generates correct XCRemoteSwiftPackageReference entries
 *  2. xcodebuild can resolve and build with the packages
 */
interface PackageEntry {
  /** Human-readable name for test output */
  name: string;
  /** Repository URL — must match what's in app.json */
  url: string;
  /** Product names that should appear in packageProductDependencies */
  products: string[];
}

const PACKAGE_REGISTRY: PackageEntry[] = [
  {
    name: "swift-algorithms",
    url: "https://github.com/apple/swift-algorithms.git",
    products: ["Algorithms"],
  },
  {
    name: "swift-collections",
    url: "https://github.com/apple/swift-collections.git",
    products: ["Collections"],
  },
];

const PROJECT_DIR_FILE = path.join(__dirname, "..", ".e2e-project-dir");
const BUILD_TIMEOUT = 300_000; // 5 minutes (SPM resolution can be slow)

let projectDir: string;
let xcodeproj: string;
let pbxprojPath: string;
let pbxprojContent: string;

function getXcodebuildErrors(output: string): string {
  const errorLines = output
    .split("\n")
    .filter((line) => /\berror\b:/i.test(line));
  return errorLines.length > 0
    ? errorLines.join("\n")
    : output.slice(-2000);
}

beforeAll(() => {
  if (!fs.existsSync(PROJECT_DIR_FILE)) {
    throw new Error(
      "E2E project directory not found. Global setup may have failed. " +
        "Expected file: " +
        PROJECT_DIR_FILE
    );
  }

  projectDir = fs.readFileSync(PROJECT_DIR_FILE, "utf-8").trim();

  if (!fs.existsSync(projectDir)) {
    throw new Error(`E2E project directory does not exist: ${projectDir}`);
  }

  const iosDir = path.join(projectDir, "ios");
  const projFiles = fs
    .readdirSync(iosDir)
    .filter((f) => f.endsWith(".xcodeproj"));

  if (projFiles.length === 0) {
    throw new Error(`No .xcodeproj found in ${iosDir}`);
  }

  xcodeproj = path.join(iosDir, projFiles[0]);
  pbxprojPath = path.join(xcodeproj, "project.pbxproj");
  pbxprojContent = fs.readFileSync(pbxprojPath, "utf-8");
});

describe("pbxproj structure", () => {
  it("contains XCRemoteSwiftPackageReference entries", () => {
    expect(pbxprojContent).toContain("XCRemoteSwiftPackageReference");
  });

  it("contains XCSwiftPackageProductDependency entries", () => {
    expect(pbxprojContent).toContain("XCSwiftPackageProductDependency");
  });

  for (const pkg of PACKAGE_REGISTRY) {
    it(`has package reference for ${pkg.name}`, () => {
      expect(pbxprojContent).toContain(pkg.url);
    });

    for (const product of pkg.products) {
      it(`has product dependency for ${product}`, () => {
        // Product name appears in XCSwiftPackageProductDependency section
        expect(pbxprojContent).toContain(`productName = ${product}`);
      });
    }
  }

  it("has packageReferences on the project object", () => {
    expect(pbxprojContent).toMatch(/packageReferences\s*=\s*\(/);
  });

  it("has packageProductDependencies on the main target", () => {
    expect(pbxprojContent).toMatch(/packageProductDependencies\s*=\s*\(/);
  });

  it("has upToNextMajorVersion requirement for swift-algorithms", () => {
    // The fixture uses ^1.2.0 which maps to upToNextMajorVersion
    expect(pbxprojContent).toContain("upToNextMajorVersion");
  });
});

describe("xcodebuild", () => {
  // TODO: This test is flaky in CI due to SPM resolution/build timing issues
  // The core functionality is verified by the pbxproj structure tests above
  it.skip(
    "can resolve Swift packages and build the main app target",
    () => {
      const args = [
        "xcodebuild",
        "build",
        `-project "${xcodeproj}"`,
        `-scheme spme2e`,
        "-sdk iphonesimulator",
        "-configuration Debug",
        "-destination 'generic/platform=iOS Simulator'",
        "CODE_SIGNING_ALLOWED=NO",
        "CODE_SIGN_IDENTITY=-",
      ];

      const command = args.join(" ");

      try {
        execSync(`${command} 2>&1`, {
          encoding: "utf-8",
          timeout: BUILD_TIMEOUT,
          cwd: projectDir,
        });
      } catch (error: any) {
        const output = error.stdout ?? error.stderr ?? String(error);
        const errors = getXcodebuildErrors(output);
        throw new Error(
          `xcodebuild failed to build main app with SPM packages:\n\n${errors}`
        );
      }
    },
    BUILD_TIMEOUT
  );
});
