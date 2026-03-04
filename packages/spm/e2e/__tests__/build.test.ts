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
interface RemotePackageEntry {
  /** Human-readable name for test output */
  name: string;
  /** Repository URL — must match what's in app.json */
  url: string;
  /** Product names that should appear in packageProductDependencies */
  products: string[];
}

interface LocalPackageEntry {
  /** Human-readable name for test output */
  name: string;
  /** Relative path to the local package */
  path: string;
  /** Product names that should appear in packageProductDependencies */
  products: string[];
}

const REMOTE_PACKAGE_REGISTRY: RemotePackageEntry[] = [
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

const LOCAL_PACKAGE_REGISTRY: LocalPackageEntry[] = [
  {
    name: "LocalTestPackage",
    path: "../LocalTestPackage",
    products: ["LocalTestPackage"],
  },
];

const PROJECT_DIR_FILE = path.join(__dirname, "..", ".e2e-project-dir");
const BUILD_TIMEOUT = 300_000; // 5 minutes (SPM resolution can be slow)

let projectDir: string;
let xcodeproj: string;
let xcworkspace: string;
let pbxprojPath: string;
let pbxprojContent: string;

function getXcodebuildErrors(output: string): string {
  const lines = output.split("\n");

  // Look for error lines, warnings, and failure indicators
  const errorLines = lines.filter((line) =>
    /\b(error|fatal)\b:/i.test(line) ||
    line.includes("** BUILD FAILED **") ||
    line.includes("xcodebuild: error:") ||
    line.includes("clang: error:") ||
    line.includes("ld: error:") ||
    // Swift compiler errors
    line.includes(".swift:") && line.includes("error:") ||
    // Also capture lines that mention "error" in common build contexts
    /^\s*(Build|Compile|Link).*error/i.test(line)
  );

  if (errorLines.length > 0) {
    return errorLines.join("\n");
  }

  // Check if BUILD FAILED exists anywhere - if so, get context around it
  const failedIndex = lines.findIndex(line => line.includes("** BUILD FAILED **"));
  if (failedIndex !== -1) {
    // Return 50 lines before BUILD FAILED to see context
    const start = Math.max(0, failedIndex - 50);
    return lines.slice(start, failedIndex + 5).join("\n");
  }

  // If no specific errors found, return last 200 lines to see what's happening
  const lastLines = lines.slice(-200).join("\n");
  return `No specific error found. Last 200 lines of output:\n${lastLines}`;
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

  // Find the workspace (created by pod install)
  const workspaceFiles = fs
    .readdirSync(iosDir)
    .filter((f) => f.endsWith(".xcworkspace"));

  if (workspaceFiles.length === 0) {
    throw new Error(`No .xcworkspace found in ${iosDir}. Did pod install run?`);
  }

  xcworkspace = path.join(iosDir, workspaceFiles[0]);
});

describe("pbxproj structure", () => {
  it("contains XCRemoteSwiftPackageReference entries", () => {
    expect(pbxprojContent).toContain("XCRemoteSwiftPackageReference");
  });

  it("contains XCSwiftPackageProductDependency entries", () => {
    expect(pbxprojContent).toContain("XCSwiftPackageProductDependency");
  });

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

describe("remote packages", () => {
  for (const pkg of REMOTE_PACKAGE_REGISTRY) {
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
});

describe("local packages", () => {
  it("contains XCLocalSwiftPackageReference entries", () => {
    expect(pbxprojContent).toContain("XCLocalSwiftPackageReference");
  });

  for (const pkg of LOCAL_PACKAGE_REGISTRY) {
    it(`has local package reference for ${pkg.name}`, () => {
      // Local packages use relativePath in the pbxproj
      // pbxproj format doesn't quote simple paths
      expect(pbxprojContent).toContain(`relativePath = ${pkg.path}`);
    });

    for (const product of pkg.products) {
      it(`has product dependency for ${product}`, () => {
        expect(pbxprojContent).toContain(`productName = ${product}`);
      });
    }
  }
});

describe("xcodebuild", () => {
  it(
    "can resolve Swift packages and build the main app target",
    () => {
      const args = [
        "xcodebuild",
        "build",
        `-workspace "${xcworkspace}"`,
        `-scheme spme2e`,
        "-sdk iphonesimulator",
        "-configuration Debug",
        "-destination 'generic/platform=iOS Simulator'",
        "CODE_SIGNING_ALLOWED=NO",
        "CODE_SIGN_IDENTITY=-",
      ];

      const command = args.join(" ");

      try {
        execSync(`${command}`, {
          encoding: "utf-8",
          timeout: BUILD_TIMEOUT,
          cwd: projectDir,
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 50 * 1024 * 1024, // 50MB - xcodebuild output can be very large
        });
      } catch (error: any) {
        // Combine stdout and stderr to capture full output
        const stdout = error.stdout || "";
        const stderr = error.stderr || "";
        const combined = stdout + "\n" + stderr;
        const errors = getXcodebuildErrors(combined || error.message || String(error));
        throw new Error(
          `xcodebuild failed to build main app with SPM packages:\n\n${errors}`
        );
      }
    },
    BUILD_TIMEOUT
  );
});
