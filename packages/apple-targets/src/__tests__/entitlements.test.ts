import plist from "@expo/plist";
import fs from "fs";
import os from "os";
import path from "path";

import {
  classifySourceEntitlementsFile,
  getEntitlementsConflictMessage,
  getGeneratedEntitlementsCodeSignPath,
  getGeneratedEntitlementsDir,
  getGeneratedEntitlementsPath,
  GENERATED_ENTITLEMENTS_FILE_NAME,
  resolveEntitlementsForCodeSign,
  writeGeneratedEntitlements,
} from "../entitlements";

// Matches the basename of TARGET_CWD — generated folders key off the source
// target directory name, not the config `name` / Xcode product name.
const TARGET_DIR_NAME = "widget";
// The target's source folder, relative to `ios/`, as passed via `props.cwd`.
const TARGET_CWD = `../targets/${TARGET_DIR_NAME}`;

function makeProjectRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apple-targets-ent-"));
  // Mirror the prebuild layout the resolver expects.
  fs.mkdirSync(path.join(root, "ios"), { recursive: true });
  return root;
}

function writeSourceEntitlements(
  projectRoot: string,
  fileName: string,
  contents: Record<string, unknown> = {},
): string {
  const sourceDir = path.join(projectRoot, "ios", TARGET_CWD);
  fs.mkdirSync(sourceDir, { recursive: true });
  const filePath = path.join(sourceDir, fileName);
  fs.writeFileSync(filePath, plist.build(contents));
  return filePath;
}

let projectRoot: string;

beforeEach(() => {
  projectRoot = makeProjectRoot();
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe("generated entitlements paths", () => {
  it("always nests generated files under ios/.targets/<targetDirName>", () => {
    expect(getGeneratedEntitlementsDir(projectRoot, TARGET_DIR_NAME)).toBe(
      path.join(projectRoot, "ios", ".targets", TARGET_DIR_NAME),
    );
    expect(getGeneratedEntitlementsPath(projectRoot, TARGET_DIR_NAME)).toBe(
      path.join(
        projectRoot,
        "ios",
        ".targets",
        TARGET_DIR_NAME,
        "generated.entitlements",
      ),
    );
  });

  it("produces an ios-relative CODE_SIGN_ENTITLEMENTS value", () => {
    // Xcode resolves CODE_SIGN_ENTITLEMENTS relative to the ios/ project root,
    // so this must NOT be absolute and must use forward slashes.
    expect(getGeneratedEntitlementsCodeSignPath(TARGET_DIR_NAME)).toBe(
      ".targets/widget/generated.entitlements",
    );
  });

  it("keys the folder by directory name, not a sanitized product/display name", () => {
    // config `name: "Expo Agent"` would sanitize to ExpoAgent for productName;
    // the generated path must still be the source folder basename.
    expect(getGeneratedEntitlementsCodeSignPath("widget")).toBe(
      ".targets/widget/generated.entitlements",
    );
    expect(getGeneratedEntitlementsCodeSignPath("widget")).not.toBe(
      ".targets/ExpoAgent/generated.entitlements",
    );
  });
});

describe("Case 1: entitlements defined in expo-target.config", () => {
  const entitlements = {
    "com.apple.security.application-groups": ["group.bacon.data"],
    "com.apple.developer.foo": true,
  };

  it("writes the generated file under .targets with the exact config contents", () => {
    const written = writeGeneratedEntitlements(
      projectRoot,
      TARGET_DIR_NAME,
      entitlements,
    );

    expect(written).toBe(
      getGeneratedEntitlementsPath(projectRoot, TARGET_DIR_NAME),
    );
    expect(fs.existsSync(written)).toBe(true);
    // Round-trip through plist to assert content rather than formatting.
    expect(plist.parse(fs.readFileSync(written, "utf8"))).toEqual(entitlements);
  });

  it("creates intermediate directories that do not yet exist", () => {
    expect(
      fs.existsSync(getGeneratedEntitlementsDir(projectRoot, TARGET_DIR_NAME)),
    ).toBe(false);

    writeGeneratedEntitlements(projectRoot, TARGET_DIR_NAME, entitlements);

    expect(
      fs.existsSync(getGeneratedEntitlementsDir(projectRoot, TARGET_DIR_NAME)),
    ).toBe(true);
  });

  it("never writes into the target's source folder", () => {
    writeGeneratedEntitlements(projectRoot, TARGET_DIR_NAME, entitlements);

    const sourceDir = path.join(projectRoot, "ios", TARGET_CWD);
    expect(fs.existsSync(sourceDir)).toBe(false);
  });

  it("is idempotent — re-running overwrites in place with the latest contents", () => {
    writeGeneratedEntitlements(projectRoot, TARGET_DIR_NAME, {
      "com.apple.developer.foo": false,
    });
    const written = writeGeneratedEntitlements(
      projectRoot,
      TARGET_DIR_NAME,
      entitlements,
    );

    expect(plist.parse(fs.readFileSync(written, "utf8"))).toEqual(entitlements);
  });

  it("resolves CODE_SIGN_ENTITLEMENTS to the generated file using the cwd basename", () => {
    writeGeneratedEntitlements(projectRoot, TARGET_DIR_NAME, entitlements);

    expect(
      resolveEntitlementsForCodeSign({
        projectRoot,
        cwd: TARGET_CWD,
      }),
    ).toEqual({
      absolutePath: getGeneratedEntitlementsPath(projectRoot, TARGET_DIR_NAME),
      codeSignEntitlements: ".targets/widget/generated.entitlements",
    });
  });
});

describe("Case 2: hand-written *.entitlements file in the source folder", () => {
  it("resolves CODE_SIGN_ENTITLEMENTS to the source file relative to ios/", () => {
    writeSourceEntitlements(projectRoot, "widget.entitlements");

    expect(
      resolveEntitlementsForCodeSign({
        projectRoot,
        cwd: TARGET_CWD,
      }),
    ).toEqual({
      absolutePath: path.join(
        projectRoot,
        "ios",
        TARGET_CWD,
        "widget.entitlements",
      ),
      codeSignEntitlements: `${TARGET_CWD}/widget.entitlements`,
    });
  });

  it("returns null when neither a generated nor a source file exists", () => {
    expect(
      resolveEntitlementsForCodeSign({
        projectRoot,
        cwd: TARGET_CWD,
      }),
    ).toBeNull();
  });
});

describe("precedence is deterministic", () => {
  it("prefers the generated file even when a source file also exists", () => {
    writeSourceEntitlements(projectRoot, "widget.entitlements");
    writeGeneratedEntitlements(projectRoot, TARGET_DIR_NAME, {
      "com.apple.developer.foo": true,
    });

    const resolved = resolveEntitlementsForCodeSign({
      projectRoot,
      cwd: TARGET_CWD,
    });

    expect(resolved?.codeSignEntitlements).toBe(
      ".targets/widget/generated.entitlements",
    );
  });
});

describe("source entitlements classification (drives migration warning vs. ignore log)", () => {
  it("flags a leftover generated.entitlements in the source folder as stale", () => {
    expect(
      classifySourceEntitlementsFile(
        path.join("targets", "widget", GENERATED_ENTITLEMENTS_FILE_NAME),
      ),
    ).toBe("stale-generated");
  });

  it("treats any other *.entitlements file as hand-written", () => {
    expect(
      classifySourceEntitlementsFile(
        path.join("targets", "widget", "widget.entitlements"),
      ),
    ).toBe("handwritten");
    expect(classifySourceEntitlementsFile("MyApp.entitlements")).toBe(
      "handwritten",
    );
  });
});

describe("conflict error message (both a generated file and a config object)", () => {
  it("names both files and offers the two ways to resolve the conflict", () => {
    expect(
      getEntitlementsConflictMessage(
        "targets/clip/generated.entitlements",
        "targets/clip/expo-target.config.js",
      ),
    ).toBe(
      "Ignoring targets/clip/generated.entitlements in favor of entitlements object in targets/clip/expo-target.config.js. Either delete the generated file or remove the entitlements object to continue.",
    );
  });
});
