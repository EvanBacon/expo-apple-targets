import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.join(__dirname, "..");
const IOS_DIR = path.join(PROJECT_ROOT, "ios");

/**
 * Test suite for local SPM package support in the spm-demo app.
 *
 * This test verifies that the @bacons/spm plugin correctly handles
 * local Swift packages specified with a `path` configuration.
 */
describe("local SPM package", () => {
  let pbxprojContent: string;
  let pbxprojPath: string;

  beforeAll(() => {
    // Run prebuild if ios directory doesn't exist or is stale
    const xcodeprojs = fs.existsSync(IOS_DIR)
      ? fs.readdirSync(IOS_DIR).filter((f) => f.endsWith(".xcodeproj"))
      : [];

    if (xcodeprojs.length === 0) {
      console.log("Running expo prebuild...");
      execSync("bun run nprebuild", {
        cwd: PROJECT_ROOT,
        stdio: "inherit",
        env: { ...process.env, CI: "1" },
      });
    }

    // Find the pbxproj file
    const updatedXcodeprojs = fs
      .readdirSync(IOS_DIR)
      .filter((f) => f.endsWith(".xcodeproj"));

    if (updatedXcodeprojs.length === 0) {
      throw new Error(`No .xcodeproj found in ${IOS_DIR}`);
    }

    pbxprojPath = path.join(
      IOS_DIR,
      updatedXcodeprojs[0],
      "project.pbxproj"
    );
    pbxprojContent = fs.readFileSync(pbxprojPath, "utf-8");
  });

  describe("pbxproj structure", () => {
    it("contains XCLocalSwiftPackageReference for local package", () => {
      expect(pbxprojContent).toContain("XCLocalSwiftPackageReference");
    });

    it("has correct relativePath for LocalSPM", () => {
      // The path in app.json is "../spm/local-pkg" relative to ios/
      expect(pbxprojContent).toContain('relativePath = "../spm/local-pkg"');
    });

    it("has product dependency for LocalSPM", () => {
      expect(pbxprojContent).toContain("productName = LocalSPM");
    });

    it("has XCSwiftPackageProductDependency entries", () => {
      expect(pbxprojContent).toContain("XCSwiftPackageProductDependency");
    });

    it("has packageReferences on the project object", () => {
      expect(pbxprojContent).toMatch(/packageReferences\s*=\s*\(/);
    });

    it("has packageProductDependencies on the main target", () => {
      expect(pbxprojContent).toMatch(/packageProductDependencies\s*=\s*\(/);
    });
  });

  describe("remote packages coexistence", () => {
    it("contains XCRemoteSwiftPackageReference for remote packages", () => {
      expect(pbxprojContent).toContain("XCRemoteSwiftPackageReference");
    });

    it("has firebase package reference", () => {
      expect(pbxprojContent).toContain(
        "https://github.com/firebase/firebase-ios-sdk.git"
      );
    });

    it("has SnapKit package reference", () => {
      expect(pbxprojContent).toContain(
        "https://github.com/SnapKit/SnapKit.git"
      );
    });

    it("has FirebaseCore product dependency", () => {
      expect(pbxprojContent).toContain("productName = FirebaseCore");
    });

    it("has SnapKit product dependency", () => {
      expect(pbxprojContent).toContain("productName = SnapKit");
    });
  });
});
