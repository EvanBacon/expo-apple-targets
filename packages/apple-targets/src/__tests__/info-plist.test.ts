import plist from "@expo/plist";
import fs from "fs";
import os from "os";
import path from "path";

import {
  getGeneratedInfoPlistBuildSettingPath,
  getGeneratedInfoPlistDir,
  getGeneratedInfoPlistPath,
  mergeInfoPlist,
  resolveInfoPlistForBuild,
  writeGeneratedInfoPlist,
} from "../info-plist";

const PRODUCT_NAME = "mywidget";
// The target's source folder, relative to `ios/`, as passed via `props.cwd`.
const TARGET_CWD = "../targets/widget";

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
  it("always nests generated files under ios/.targets/<productName>/Info.plist", () => {
    expect(getGeneratedInfoPlistDir(projectRoot, PRODUCT_NAME)).toBe(
      path.join(projectRoot, "ios", ".targets", PRODUCT_NAME),
    );
    expect(getGeneratedInfoPlistPath(projectRoot, PRODUCT_NAME)).toBe(
      path.join(projectRoot, "ios", ".targets", PRODUCT_NAME, "Info.plist"),
    );
  });

  it("produces an ios-relative INFOPLIST_FILE value", () => {
    // Xcode resolves INFOPLIST_FILE relative to the ios/ project root,
    // so this must NOT be absolute and must use forward slashes.
    expect(getGeneratedInfoPlistBuildSettingPath(PRODUCT_NAME)).toBe(
      ".targets/mywidget/Info.plist",
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
      PRODUCT_NAME,
      infoPlist,
    );

    expect(written).toBe(getGeneratedInfoPlistPath(projectRoot, PRODUCT_NAME));
    expect(fs.existsSync(written)).toBe(true);
    // Round-trip through plist to assert content rather than formatting.
    expect(plist.parse(fs.readFileSync(written, "utf8"))).toEqual(infoPlist);
  });

  it("creates intermediate directories that do not yet exist", () => {
    expect(
      fs.existsSync(getGeneratedInfoPlistDir(projectRoot, PRODUCT_NAME)),
    ).toBe(false);

    writeGeneratedInfoPlist(projectRoot, PRODUCT_NAME, infoPlist);

    expect(
      fs.existsSync(getGeneratedInfoPlistDir(projectRoot, PRODUCT_NAME)),
    ).toBe(true);
  });

  it("never writes into the target's source folder", () => {
    writeGeneratedInfoPlist(projectRoot, PRODUCT_NAME, infoPlist);

    const sourceDir = path.join(projectRoot, "ios", TARGET_CWD);
    expect(fs.existsSync(sourceDir)).toBe(false);
  });

  it("is idempotent — re-running overwrites in place with the latest contents", () => {
    writeGeneratedInfoPlist(projectRoot, PRODUCT_NAME, {
      MyBackendURL: "https://old.example.com",
    });
    const written = writeGeneratedInfoPlist(
      projectRoot,
      PRODUCT_NAME,
      infoPlist,
    );

    expect(plist.parse(fs.readFileSync(written, "utf8"))).toEqual(infoPlist);
  });

  it("resolves INFOPLIST_FILE to the generated file", () => {
    writeGeneratedInfoPlist(projectRoot, PRODUCT_NAME, infoPlist);

    expect(
      resolveInfoPlistForBuild({
        projectRoot,
        productName: PRODUCT_NAME,
        cwd: TARGET_CWD,
      }),
    ).toEqual({
      absolutePath: getGeneratedInfoPlistPath(projectRoot, PRODUCT_NAME),
      infoPlistFile: ".targets/mywidget/Info.plist",
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
        productName: PRODUCT_NAME,
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
        productName: PRODUCT_NAME,
        cwd: TARGET_CWD,
      }),
    ).toBeNull();
  });
});

describe("precedence is deterministic", () => {
  it("prefers the generated file even when a source file also exists", () => {
    writeSourceInfoPlist(projectRoot);
    writeGeneratedInfoPlist(projectRoot, PRODUCT_NAME, {
      MyBackendURL: "https://example.com",
    });

    const resolved = resolveInfoPlistForBuild({
      projectRoot,
      productName: PRODUCT_NAME,
      cwd: TARGET_CWD,
    });

    expect(resolved?.infoPlistFile).toBe(".targets/mywidget/Info.plist");
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
