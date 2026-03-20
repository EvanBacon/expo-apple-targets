/**
 * Integration test for prebuild idempotency.
 *
 * This test verifies that running applyXcodeChanges twice on the same project
 * produces identical output (no UUID churn). It uses the real @bacons/xcode
 * library to parse and serialize project files.
 *
 * Run with: bun test src/__tests__/idempotent-integration.test.ts
 */

import { XcodeProject } from "@bacons/xcode";
import * as xcodeParse from "@bacons/xcode/json";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";

import { applyXcodeChanges } from "../with-xcode-changes";
import type { XcodeSettings } from "../configuration-list";
import type { ExpoConfig } from "expo/config";

const BLANK_TEMPLATE = path.join(__dirname, "../../prebuild-blank.tgz");

function createTempProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "idempotent-test-"));
  execSync(`tar xzf ${BLANK_TEMPLATE} -C ${tmpDir} --strip-components=1`, {
    stdio: "ignore",
  });
  return tmpDir;
}

function getPbxprojPath(projectRoot: string): string {
  return path.join(
    projectRoot,
    "ios",
    "HelloWorld.xcodeproj",
    "project.pbxproj"
  );
}

function serializeProject(project: XcodeProject): string {
  return xcodeParse.build(project.toJSON());
}

function createExpoConfig(projectRoot: string): ExpoConfig {
  return {
    name: "HelloWorld",
    slug: "hello-world",
    version: "1.0.0",
    ios: { bundleIdentifier: "com.example.helloworld" },
    _internal: { projectRoot },
  };
}

function createWidgetSettings(projectRoot: string): XcodeSettings {
  const targetDir = path.join(projectRoot, "targets", "widget");
  fs.mkdirSync(targetDir, { recursive: true });

  // The Info.plist also needs to live in the ios-relative path since
  // isNativeTargetOfType reads it via getInfoPlist() which resolves
  // INFOPLIST_FILE relative to the ios/ directory.
  const iosTargetDir = path.join(projectRoot, "ios", "..", "targets", "widget");
  fs.mkdirSync(iosTargetDir, { recursive: true });

  // Create a proper Info.plist with NSExtensionPointIdentifier so that
  // isNativeTargetOfType can identify the target on subsequent runs
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
  fs.writeFileSync(path.join(targetDir, "Info.plist"), infoPlist);
  fs.writeFileSync(path.join(iosTargetDir, "Info.plist"), infoPlist);

  const configPath = path.join(targetDir, "expo-target.config.json");
  fs.writeFileSync(configPath, JSON.stringify({ type: "widget" }));

  return {
    name: "widgetExtension",
    productName: "widgetExtension",
    cwd: "../targets/widget",
    bundleId: "com.example.helloworld.widget",
    deploymentTarget: "16.4",
    currentProjectVersion: 1,
    frameworks: ["WidgetKit", "SwiftUI"],
    type: "widget",
    configPath,
  };
}

describe("prebuild idempotency (integration)", () => {
  let projectRoot: string;

  beforeAll(() => {
    projectRoot = createTempProject();
  });

  afterAll(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it("produces identical pbxproj when run twice with no changes", async () => {
    const pbxprojPath = getPbxprojPath(projectRoot);
    const config = createExpoConfig(projectRoot);
    const widgetSettings = createWidgetSettings(projectRoot);

    // First run: creates the target
    const project1 = XcodeProject.open(pbxprojPath);
    await applyXcodeChanges(config, project1, widgetSettings);
    const output1 = serializeProject(project1);
    fs.writeFileSync(pbxprojPath, output1);

    // Second run: target already exists, should produce identical output
    const project2 = XcodeProject.open(pbxprojPath);
    await applyXcodeChanges(config, project2, widgetSettings);
    const output2 = serializeProject(project2);

    if (output1 !== output2) {
      // Show a helpful diff
      const lines1 = output1.split("\n");
      const lines2 = output2.split("\n");
      const diffs: string[] = [];
      const maxLen = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLen; i++) {
        if (lines1[i] !== lines2[i]) {
          diffs.push(`Line ${i + 1}:`);
          diffs.push(`  - ${lines1[i] ?? "(missing)"}`);
          diffs.push(`  + ${lines2[i] ?? "(missing)"}`);
        }
      }
      throw new Error(
        `pbxproj is not idempotent. Differences:\n${diffs.join("\n")}`
      );
    }
  });

  it("preserves framework UUIDs when build settings change", async () => {
    // Reset project
    const tmpDir = createTempProject();
    const pbxprojPath = getPbxprojPath(tmpDir);
    const config = createExpoConfig(tmpDir);
    const widgetSettings = createWidgetSettings(tmpDir);

    try {
      // First run
      const project1 = XcodeProject.open(pbxprojPath);
      await applyXcodeChanges(config, project1, widgetSettings);
      const output1 = serializeProject(project1);
      fs.writeFileSync(pbxprojPath, output1);

      // Second run with different deployment target
      const modifiedSettings = { ...widgetSettings, deploymentTarget: "17.0" };
      const project2 = XcodeProject.open(pbxprojPath);
      await applyXcodeChanges(config, project2, modifiedSettings);
      const output2 = serializeProject(project2);

      // Settings should change
      expect(output2).toContain("IPHONEOS_DEPLOYMENT_TARGET = 17.0");
      expect(output1).toContain("IPHONEOS_DEPLOYMENT_TARGET = 16.4");

      // Framework UUIDs should NOT change
      const fwPattern =
        /([A-F0-9X]{24}) \/\* (WidgetKit|SwiftUI)\.framework/g;
      const uuids1 = [...output1.matchAll(fwPattern)].map((m) => m[1]);
      const uuids2 = [...output2.matchAll(fwPattern)].map((m) => m[1]);

      expect(uuids1.length).toBeGreaterThan(0);
      expect(uuids2).toEqual(uuids1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
