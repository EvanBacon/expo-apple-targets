import fs from "fs";
import os from "os";
import path from "path";

import {
  resolveExportJs,
  RN_BUNDLE_PODS_ROOT,
  withExportJsBuildSettings,
} from "../export-js";

const repoRoot = path.resolve(__dirname, "../../../..");

describe(resolveExportJs, () => {
  it("does not bundle JS for a native clip without pods.rb", () => {
    const kitchenClip = path.join(repoRoot, "apps/kitchen/targets/app-clip");
    expect(fs.existsSync(kitchenClip)).toBe(true);
    expect(fs.existsSync(path.join(kitchenClip, "pods.rb"))).toBe(false);
    expect(
      resolveExportJs({ type: "clip", targetDirectory: kitchenClip }),
    ).toBe(false);
  });

  it("bundles JS for an app clip that ships pods.rb", () => {
    const clipDemo = path.join(repoRoot, "apps/app-clip-demo/targets/clip");
    expect(fs.existsSync(path.join(clipDemo, "pods.rb"))).toBe(true);
    expect(resolveExportJs({ type: "clip", targetDirectory: clipDemo })).toBe(
      true,
    );
  });

  it("lets an explicit exportJs boolean override the pods.rb default", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apple-targets-export-"));
    fs.writeFileSync(path.join(dir, "pods.rb"), "# pods\n");
    expect(
      resolveExportJs({
        type: "clip",
        exportJs: false,
        targetDirectory: dir,
      }),
    ).toBe(false);
    expect(
      resolveExportJs({
        type: "widget",
        exportJs: true,
        targetDirectory: dir,
      }),
    ).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("does not bundle JS for non-clip targets unless exportJs is set", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apple-targets-export-"));
    fs.writeFileSync(path.join(dir, "pods.rb"), "# pods\n");
    expect(resolveExportJs({ type: "widget", targetDirectory: dir })).toBe(
      false,
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe(withExportJsBuildSettings, () => {
  it("sets PODS_ROOT so the bundle script can source ios/.xcode.env", () => {
    const settings = withExportJsBuildSettings(
      { debug: { PRODUCT_NAME: "clip" }, release: { PRODUCT_NAME: "clip" } },
      true,
    );
    expect(settings.debug.PODS_ROOT).toBe(RN_BUNDLE_PODS_ROOT);
    expect(settings.release.PODS_ROOT).toBe("$(SRCROOT)/Pods");
  });

  it("leaves build settings alone when the target does not bundle JS", () => {
    const original = {
      debug: { PRODUCT_NAME: "appclip" },
      release: { PRODUCT_NAME: "appclip" },
    };
    expect(withExportJsBuildSettings(original, false)).toBe(original);
  });
});

describe("pods.rb target name", () => {
  it("sanitizes the CocoaPods target the same way as the Xcode product name", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../with-pod-target-extension.ts"),
      "utf8",
    );
    expect(source).toContain('.gsub(/[\\W_]+/, "")');
  });
});
