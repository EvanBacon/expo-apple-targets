import plist from "@expo/plist";
import fs from "fs";
import os from "os";
import path from "path";

import {
  getGeneratedInfoPlistBuildSettingPath,
  getGeneratedInfoPlistDir,
  getGeneratedInfoPlistPath,
  getInfoPlistConflictMessage,
  mergeInfoPlist,
  resolveInfoPlistForBuild,
  writeGeneratedInfoPlist,
} from "../info-plist";

// Matches the basename of TARGET_CWD — generated folders key off the source
// target directory name, not the config `name` / Xcode product name.
const TARGET_DIR_NAME = "widget";
// The target's source folder, relative to `ios/`, as passed via `props.cwd`.
const TARGET_CWD = `../targets/${TARGET_DIR_NAME}`;

function makeProjectRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apple-targets-infoplist-"));
  // Mirror the prebuild layout the resolver expects.
  fs.mkdirSync(path.join(root, "ios"), { recursive: true });
  return root;
}

function writeSourceInfoPlist(
  projectRoot: string,
  contents: Record<string, unknown> = {},
): string {
  const sourceDir = path.join(projectRoot, "ios", TARGET_CWD);
  fs.mkdirSync(sourceDir, { recursive: true });
  const filePath = path.join(sourceDir, "Info.plist");
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

describe("generated Info.plist paths", () => {
  it("always nests generated files under ios/.targets/<targetDirName>/Info.plist", () => {
    expect(getGeneratedInfoPlistDir(projectRoot, TARGET_DIR_NAME)).toBe(
      path.join(projectRoot, "ios", ".targets", TARGET_DIR_NAME),
    );
    expect(getGeneratedInfoPlistPath(projectRoot, TARGET_DIR_NAME)).toBe(
      path.join(projectRoot, "ios", ".targets", TARGET_DIR_NAME, "Info.plist"),
    );
  });

  it("produces an ios-relative INFOPLIST_FILE value", () => {
    // Xcode resolves INFOPLIST_FILE relative to the ios/ project root,
    // so this must NOT be absolute and must use forward slashes.
    expect(getGeneratedInfoPlistBuildSettingPath(TARGET_DIR_NAME)).toBe(
      ".targets/widget/Info.plist",
    );
  });

  it("keys the folder by directory name, not a sanitized product/display name", () => {
    expect(getGeneratedInfoPlistBuildSettingPath("widget")).toBe(
      ".targets/widget/Info.plist",
    );
    expect(getGeneratedInfoPlistBuildSettingPath("widget")).not.toBe(
      ".targets/ExpoAgent/Info.plist",
    );
  });
});

describe("Case 1: infoPlist defined in expo-target.config", () => {
  const infoPlist = {
    CFBundleDisplayName: "My Widget",
    MyBackendURL: "https://example.com",
  };

  it("writes the generated file under .targets with the exact merged contents", () => {
    const written = writeGeneratedInfoPlist(
      projectRoot,
      TARGET_DIR_NAME,
      infoPlist,
    );

    expect(written).toBe(
      getGeneratedInfoPlistPath(projectRoot, TARGET_DIR_NAME),
    );
    expect(fs.existsSync(written)).toBe(true);
    // Round-trip through plist to assert content rather than formatting.
    expect(plist.parse(fs.readFileSync(written, "utf8"))).toEqual(infoPlist);
  });

  it("creates intermediate directories that do not yet exist", () => {
    expect(
      fs.existsSync(getGeneratedInfoPlistDir(projectRoot, TARGET_DIR_NAME)),
    ).toBe(false);

    writeGeneratedInfoPlist(projectRoot, TARGET_DIR_NAME, infoPlist);

    expect(
      fs.existsSync(getGeneratedInfoPlistDir(projectRoot, TARGET_DIR_NAME)),
    ).toBe(true);
  });

  it("never writes into the target's source folder", () => {
    writeGeneratedInfoPlist(projectRoot, TARGET_DIR_NAME, infoPlist);

    const sourceDir = path.join(projectRoot, "ios", TARGET_CWD);
    expect(fs.existsSync(sourceDir)).toBe(false);
  });

  it("is idempotent — re-running overwrites in place with the latest contents", () => {
    writeGeneratedInfoPlist(projectRoot, TARGET_DIR_NAME, {
      MyBackendURL: "https://old.example.com",
    });
    const written = writeGeneratedInfoPlist(
      projectRoot,
      TARGET_DIR_NAME,
      infoPlist,
    );

    expect(plist.parse(fs.readFileSync(written, "utf8"))).toEqual(infoPlist);
  });

  it("resolves INFOPLIST_FILE to the generated file using the cwd basename", () => {
    writeGeneratedInfoPlist(projectRoot, TARGET_DIR_NAME, infoPlist);

    expect(
      resolveInfoPlistForBuild({
        projectRoot,
        cwd: TARGET_CWD,
      }),
    ).toEqual({
      absolutePath: getGeneratedInfoPlistPath(projectRoot, TARGET_DIR_NAME),
      infoPlistFile: ".targets/widget/Info.plist",
    });
  });
});

describe("Case 2: hand-written Info.plist file in the source folder", () => {
  it("resolves INFOPLIST_FILE to the source file relative to ios/", () => {
    writeSourceInfoPlist(projectRoot, {
      NSExtension: {
        NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
      },
    });

    expect(
      resolveInfoPlistForBuild({
        projectRoot,
        cwd: TARGET_CWD,
      }),
    ).toEqual({
      absolutePath: path.join(projectRoot, "ios", TARGET_CWD, "Info.plist"),
      infoPlistFile: `${TARGET_CWD}/Info.plist`,
    });
  });

  it("returns null when neither a generated nor a source file exists", () => {
    expect(
      resolveInfoPlistForBuild({
        projectRoot,
        cwd: TARGET_CWD,
      }),
    ).toBeNull();
  });
});

describe("precedence is deterministic", () => {
  it("prefers the generated file even when a source file also exists", () => {
    writeSourceInfoPlist(projectRoot);
    writeGeneratedInfoPlist(projectRoot, TARGET_DIR_NAME, {
      MyBackendURL: "https://example.com",
    });

    const resolved = resolveInfoPlistForBuild({
      projectRoot,
      cwd: TARGET_CWD,
    });

    expect(resolved?.infoPlistFile).toBe(".targets/widget/Info.plist");
  });
});

describe("mergeInfoPlist", () => {
  it("overwrites existing keys from the base and preserves unknown keys", () => {
    const base = {
      CFBundleDisplayName: "Old Name",
      NSExtension: {
        NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
      },
      CustomKey: "keep-me",
    };
    const overlay = {
      CFBundleDisplayName: "New Name",
      MyBackendURL: "https://example.com",
    };

    expect(mergeInfoPlist(base, overlay)).toEqual({
      CFBundleDisplayName: "New Name",
      NSExtension: {
        NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
      },
      CustomKey: "keep-me",
      MyBackendURL: "https://example.com",
    });
  });

  it("does not mutate the base object", () => {
    const base = { A: 1 };
    const overlay = { B: 2 };
    mergeInfoPlist(base, overlay);
    expect(base).toEqual({ A: 1 });
  });
});

describe("conflict message (both a source Info.plist and a config object)", () => {
  it("names both sources and offers the two ways to resolve the conflict", () => {
    expect(
      getInfoPlistConflictMessage(
        "targets/widget/Info.plist",
        "targets/widget/expo-target.config.js",
      ),
    ).toBe(
      "Found both targets/widget/Info.plist and an infoPlist object in targets/widget/expo-target.config.js. Keys are merged (config overwrites source) into the generated Info.plist under ios/.targets/. Either delete the source Info.plist to use only the config, or remove the infoPlist object to hand-manage the file.",
    );
  });
});
