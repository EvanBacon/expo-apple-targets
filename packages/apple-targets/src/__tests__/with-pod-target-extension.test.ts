import {
  buildPodTargetExtension,
  productNameForTarget,
  upsertPodTargetExtension,
} from "../pod-target-loader";

describe("pods.rb target name", () => {
  it("uses the sanitized config name, not the folder", () => {
    expect(productNameForTarget("MyWidget", "widget", "widget")).toBe(
      "MyWidget",
    );
    expect(productNameForTarget(undefined, "app-clip", "clip")).toBe("appclip");
  });

  it("emits the Xcode product name for a renamed target", () => {
    const snippet = buildPodTargetExtension([
      {
        podsRbRelativeToIos: "../targets/widget/pods.rb",
        productName: "MyWidget",
      },
    ]);
    expect(snippet).toContain("'../targets/widget/pods.rb' => 'MyWidget'");
    expect(snippet).not.toContain("target 'widget'");
    expect(snippet).toContain("target target_name do");
  });

  it("replaces a legacy folder-name loader so incremental prebuild picks up the name", () => {
    const legacy = `platform :ios, '16.4'\n\n# apple-targets-extension-loader -- Dynamic loading of target configurations\nDir.glob(File.join(__dir__, '..', 'targets', '**', 'pods.rb')).each do |target_file|\n  target_name = File.basename(File.dirname(target_file))\n  target target_name do\n    eval(File.read(target_file), binding, target_file)\n  end\nend\n`;
    const next = upsertPodTargetExtension(legacy, [
      {
        podsRbRelativeToIos: "../targets/widget/pods.rb",
        productName: "MyWidget",
      },
    ]);
    expect(next).toContain("platform :ios, '16.4'");
    expect(next).toContain("=> 'MyWidget'");
    expect(next).not.toContain("File.basename");
    expect(next.match(/apple-targets-extension-loader --/g)).toHaveLength(1);
  });
});
