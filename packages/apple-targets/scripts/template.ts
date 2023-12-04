// Generate aspects of the plugin from an Xcode project.
import {
  PBXAggregateTarget,
  PBXFrameworksBuildPhase,
  PBXLegacyTarget,
  PBXNativeTarget,
  XcodeProject,
} from "@bacons/xcode";
import plist from "@expo/plist";
import fs from "fs-extra";
import { sync as globSync } from "glob";
import path from "path";

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
        (file) =>
          `"${file.props.fileRef.props.name?.replace(".framework", "")}"`
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

  const defConfig = target.getDefaultConfiguration();
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

function assertPBXNativeTarget(
  target: PBXNativeTarget | PBXAggregateTarget | PBXLegacyTarget
): asserts target is PBXNativeTarget {
  if (!PBXNativeTarget.is(target)) {
    throw new Error(`Expected PBXNativeTarget, got ${target.isa}`);
  }
}

function assertBasicConfigs(
  target: PBXNativeTarget | PBXAggregateTarget | PBXLegacyTarget
) {
  // assertPBXNativeTarget(target);
  const configs = target.props.buildConfigurationList.props.buildConfigurations;

  // Extract the one named "Release" and the one named "Debug" then assert that any others are unexpected and return Release and Debug.
  const releaseConfig = configs.find(
    (config) => config.props.name === "Release"
  );
  const debugConfig = configs.find((config) => config.props.name === "Debug");
  if (!releaseConfig || !debugConfig) {
    throw new Error(
      `Expected to find Release and Debug configurations for target ${target.getDisplayName()}`
    );
  }
  const otherConfigs = configs.filter(
    (config) => config.props.name !== "Release" && config.props.name !== "Debug"
  );
  if (otherConfigs.length > 0) {
    throw new Error(
      `Unexpected configurations found for target ${target.getDisplayName()}: ${otherConfigs
        .map((config) => config.props.name)
        .join(", ")}`
    );
  }
  return { releaseConfig, debugConfig };
}

export function resolveXcodeBuildSetting(
  value: string,
  lookup: (buildSetting: string) => string | undefined
): string {
  const parsedValue = value?.replace(/\$\(([^()]*|\([^)]*\))\)/g, (match) => {
    // Remove the `$(` and `)`, then split modifier(s) from the variable name.
    const [variable, ...transformations] = match.slice(2, -1).split(":");
    // Resolve the variable recursively.
    let lookedUp = lookup(variable);
    if (lookedUp) {
      lookedUp = resolveXcodeBuildSetting(lookedUp, lookup);
    }
    let resolved = lookedUp;

    // Ref: http://codeworkshop.net/posts/xcode-build-setting-transformations
    transformations.forEach((modifier) => {
      switch (modifier) {
        case "lower":
          // A lowercase representation.
          resolved = resolved?.toLowerCase();
          break;
        case "upper":
          // An uppercase representation.
          resolved = resolved?.toUpperCase();
          break;
        case "suffix":
          if (resolved) {
            // The extension of a path including the '.' divider.
            resolved = path.extname(resolved);
          }
          break;
        case "file":
          if (resolved) {
            // The file portion of a path.
            resolved = path.basename(resolved);
          }
          break;
        case "dir":
          if (resolved) {
            // The directory portion of a path.
            resolved = path.dirname(resolved);
          }
          break;
        case "base":
          if (resolved) {
            // The base name of a path - the last path component with any extension removed.
            const b = path.basename(resolved);
            const extensionIndex = b.lastIndexOf(".");
            resolved = extensionIndex === -1 ? b : b.slice(0, extensionIndex);
          }
          break;
        case "rfc1034identifier":
          // A representation suitable for use in a DNS name.

          // TODO: Check the spec if there is one, this is just what we had before.
          resolved = resolved?.replace(/[^a-zA-Z0-9]/g, "-");
          // resolved = resolved.replace(/[\/\*\s]/g, '-');
          break;
        case "c99extidentifier":
          // Like identifier, but with support for extended characters allowed by C99. Added in Xcode 6.
          // TODO: Check the spec if there is one.
          resolved = resolved?.replace(/[-\s]/g, "_");
          break;
        case "standardizepath":
          if (resolved) {
            // The equivalent of calling stringByStandardizingPath on the string.
            // https://developer.apple.com/documentation/foundation/nsstring/1407194-standardizingpath
            resolved = path.resolve(resolved);
          }
          break;
        default:
          resolved ||= modifier.match(/default=(.*)/)?.[1];
          break;
      }
    });

    return resolveXcodeBuildSetting(resolved ?? "", lookup);
  });

  if (parsedValue !== value) {
    return resolveXcodeBuildSetting(parsedValue, lookup);
  }
  return value;
}

export function getConfigurationsForTargets(project: XcodeProject) {
  const templateBuildSettings: Record<
    string,
    {
      default: Record<string, string>;
      release: Record<string, string>;
      debug: Record<string, string>;
    }
  > = {};

  project.rootObject.props.targets.forEach((target) => {
    if (!PBXNativeTarget.is(target)) {
      return;
    }

    // console.log("settings for target:", target.props.productType);
    const configs = assertBasicConfigs(target);

    const plist = configs.releaseConfig.getInfoPlist();
    const extensionType = plist.NSExtension?.NSExtensionPointIdentifier;

    // Only collect templates for extensions.
    if (!extensionType) {
      return;
    }

    // Get the build settings from both and create three objects:
    // 1. Shared settings
    // 2. Release-specific settings
    // 3. Debug-specific settings

    const allSettings = {
      ...configs.releaseConfig.props.buildSettings,
      ...configs.debugConfig.props.buildSettings,
    };

    const sharedSettings = {};
    const releaseSettings = {};
    const debugSettings = {};

    const d = configs.debugConfig.props.buildSettings;
    const r = configs.releaseConfig.props.buildSettings;

    Object.entries(allSettings).forEach(([key, value]) => {
      // @ts-ignore
      if (key in r && key in d && r[key] === d[key]) {
        // @ts-ignore
        sharedSettings[key] = value;
        // @ts-ignore
      } else if (key in r && !(key in d)) {
        // @ts-ignore
        releaseSettings[key] = value;
        // @ts-ignore
      } else if (key in d && !(key in r)) {
        // @ts-ignore
        debugSettings[key] = value;
      }
    });

    templateBuildSettings[extensionType] = {
      default: sharedSettings,
      release: releaseSettings,
      debug: debugSettings,
    };
  });

  console.log(JSON.stringify(templateBuildSettings, null, 2));

  return templateBuildSettings;
}

function findUpProjectRoot(cwd: string): string | null {
  const pkgJsonPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    return cwd;
  }
  const parentDir = path.dirname(cwd);
  if (parentDir === cwd) {
    return null;
  }
  return findUpProjectRoot(parentDir);
}

(async () => {
  const projPath = globSync("ios/*/project.pbxproj", {
    cwd: path.join(
      findUpProjectRoot(path.dirname(path.dirname(__dirname)))!,
      "apps/fixture"
    ),
    absolute: true,
  })[0];
  const project = XcodeProject.open(projPath);

  ensureWrite(
    path.join(
      findUpProjectRoot(__dirname)!,
      "target-plugin/template",
      "XCBuildConfiguration.json"
    ),
    JSON.stringify(getConfigurationsForTargets(project), null, 2)
  );

  // console.log(getFrameworksForTargets(project));

  // console.log("--- NSExtensionPointIdentifier ---");
  // console.log(getPossibleExtensionIds(project));
  process.exit(0);
})();

function ensureWrite(p: string, src: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, src);
}
