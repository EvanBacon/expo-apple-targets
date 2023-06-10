// Generate aspects of the plugin from an Xcode project.

import plist from "@expo/plist";
import fs from "fs-extra";
import path from "path";

import {
  PBXAggregateTarget,
  PBXFrameworksBuildPhase,
  PBXLegacyTarget,
  PBXNativeTarget,
  XcodeProject,
} from "@bacons/xcode";

import { sync as globSync } from "glob";

export function printPlistsAsJson() {
  const cwd = process.cwd();
  const files = globSync("targets/*/Info.plist", { cwd });
  const json = files.map((file) => {
    const content = fs.readFileSync(path.join(cwd, file), "utf8");
    return [file, plist.parse(content)];
  });
  console.log(JSON.stringify(json, null, 2));
}

export function getPossibleExtensionIds(project: XcodeProject) {
  return project.rootObject.props.targets
    .map((target) => {
      return getNativeTargetId(target);
    })
    .filter(Boolean);
}

export function getFrameworksForTargets(project: XcodeProject) {
  const items: [string, string][] = [];
  project.rootObject.props.targets.forEach((target) => {
    // Print frameworks for each target
    // console.log(target.props.name);
    const frameworks = target.props.buildPhases.find(
      (phase) => phase.isa === "PBXFrameworksBuildPhase"
    ) as PBXFrameworksBuildPhase;
    const frameworkNames = frameworks.props.files
      .map(
        (file) => `"${file.props.fileRef.props.name.replace(".framework", "")}"`
      )
      .join(", ");

    if (frameworkNames.length === 0) {
      return;
    }

    const targetId = getNativeTargetId(target);
    if (targetId) {
      items.push([targetId, frameworkNames]);
    }
  });

  // Remove duplicates
  const uniqueItems = items
    .filter(
      (item, index, self) => index === self.findIndex((t) => t[0] === item[0])
    )
    .sort((a, b) => a[0].localeCompare(b[0]));

  return uniqueItems
    .map(([target, frameworkNames], index) => {
      return `${index === 0 ? "" : "else "}if (type === "${target}") {
            return [${frameworkNames}];
            }`;
    })
    .join("\n");
}

// printPlistsAsJson();

export function getNativeTargetId(
  target: PBXNativeTarget | PBXAggregateTarget | PBXLegacyTarget
): string | null {
  if (
    PBXNativeTarget.is(target) &&
    target.props.productType !== "com.apple.product-type.app-extension"
  ) {
    return null;
  }
  // Could be a Today Extension, Share Extension, etc.

  const defConfig =
    target.props.buildConfigurationList.props.buildConfigurations.find(
      (config) =>
        config.props.name ===
        target.props.buildConfigurationList.props.defaultConfigurationName
    );
  const infoPlistPath = path.join(
    // TODO: Resolve root better
    path.dirname(path.dirname(target.project.getXcodeProject().filePath)),
    defConfig.props.buildSettings.INFOPLIST_FILE
  );

  const infoPlist = plist.parse(fs.readFileSync(infoPlistPath, "utf8"));

  if (!infoPlist.NSExtension?.NSExtensionPointIdentifier) {
    console.error(
      "No NSExtensionPointIdentifier found in extension Info.plist for target: " +
        target.getDisplayName()
    );
    return null;
  }

  return infoPlist.NSExtension?.NSExtensionPointIdentifier;
}

(async () => {
  const projPath = globSync("ios/*/project.pbxproj", {
    cwd: process.cwd(),
    absolute: true,
  })[0];
  const project = XcodeProject.open(projPath);

  console.log(getFrameworksForTargets(project));

  console.log("--- NSExtensionPointIdentifier ---");
  console.log(getPossibleExtensionIds(project));
  process.exit(0);
})();
