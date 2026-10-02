import fs from "fs";
import path from "path";

import { TARGET_REGISTRY } from "../target";
import { TARGET_GROUPS } from "../../e2e/target-groups";

describe("e2e target groups", () => {
  const templatedTypes = Object.entries(TARGET_REGISTRY)
    .filter(([, def]) => !def.hasNoTemplate)
    .map(([type]) => type);

  const grouped = Object.values(TARGET_GROUPS).flat();

  it("assigns every templated target type to exactly one xcodebuild shard", () => {
    const counts = new Map<string, number>();
    for (const type of grouped) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    const missing = templatedTypes.filter((type) => !counts.has(type));
    const unknown = grouped.filter((type) => !(type in TARGET_REGISTRY));
    const duplicated = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([type]) => type);

    expect(missing).toEqual([]);
    expect(unknown).toEqual([]);
    expect(duplicated).toEqual([]);
  });

  it("leaves imessage out of the build matrix because it has no template", () => {
    expect(TARGET_REGISTRY.imessage.hasNoTemplate).toBe(true);
    expect(grouped).not.toContain("imessage");
  });

  it("compiles Live Activities as part of the widget target", () => {
    const liveActivity = fs.readFileSync(
      path.join(
        __dirname,
        "../../../create-target/templates/widget/WidgetLiveActivity.swift"
      ),
      "utf8"
    );
    const bundle = fs.readFileSync(
      path.join(
        __dirname,
        "../../../create-target/templates/widget/index.swift"
      ),
      "utf8"
    );

    expect(TARGET_GROUPS["widgets-clips-watch"]).toContain("widget");
    expect(liveActivity).toContain("ActivityKit");
    expect(liveActivity).toContain("ActivityConfiguration");
    expect(bundle).toContain("WidgetLiveActivity()");
  });

  it("lists exactly the TARGET_GROUPS shards in the macOS e2e workflow", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "../../../../.github/workflows/e2e.yml"),
      "utf8"
    );
    const names = Object.keys(TARGET_GROUPS);
    const listed = [...workflow.matchAll(/^\s+- ([a-z0-9-]+)$/gm)]
      .map((match) => match[1])
      .filter((name) => names.includes(name));

    expect(listed).toEqual(names);
  });
});
