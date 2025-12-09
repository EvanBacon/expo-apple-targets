import {
  PBXBuildFile,
  PBXFileReference,
  PBXFileSystemSynchronizedBuildFileExceptionSet,
  PBXFileSystemSynchronizedRootGroup,
  PBXGroup,
  PBXNativeTarget,
  PBXShellScriptBuildPhase,
  XcodeProject,
} from "@bacons/xcode";
import { ExpoConfig } from "@expo/config";
import { ConfigPlugin } from "@expo/config-plugins";
import fs from "fs";
import { globSync } from "glob";
import path from "path";

import {
  getMainAppTarget,
  isNativeTargetOfType,
  needsEmbeddedSwift,
  productTypeForType,
} from "./target";
import { withXcodeProjectBeta } from "./with-bacons-xcode";
import assert from "assert";

import {
  XcodeSettings,
  createConfigurationListForType,
} from "./configuration-list";
import { warnOnce } from "./util";

export const withXcodeChanges: ConfigPlugin<XcodeSettings> = (
  config,
  props
) => {
  return withXcodeProjectBeta(config, async (config) => {
    await applyXcodeChanges(config, config.modResults, props);
    return config;
  });
};

function getMainMarketingVersion(project: XcodeProject) {
  const mainTarget = getMainAppTarget(project);
  const config = mainTarget.getDefaultConfiguration();
  const info = config.getInfoPlist();

  const version = info.CFBundleShortVersionString;
  // console.log('getMainMarketingVersion', mainTarget.getDisplayName(), version)

  if (!version || version === "$(MARKETING_VERSION)") {
    // console.log('getMainMarketingVersion.fallback', config.props.buildSettings.MARKETING_VERSION)
    return config.props.buildSettings.MARKETING_VERSION;
  }

  return version;
}

async function applyXcodeChanges(
  config: ExpoConfig,
  project: XcodeProject,
  props: XcodeSettings
) {
  const mainAppTarget = getMainAppTarget(project);

  // Special setting for share extensions.
  if (needsEmbeddedSwift(props.type)) {
    // Add ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES to the main app target
    mainAppTarget.setBuildSetting(
      "ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES",
      "YES"
    );
  }

  function getExtensionTargets(): PBXNativeTarget[] {
    return project.rootObject.props.targets.filter((target) => {
      return (
        PBXNativeTarget.is(target) && isNativeTargetOfType(target, props.type)
      );
    }) as PBXNativeTarget[];
  }

  const targets = getExtensionTargets();

  const productName = props.productName;

  let targetToUpdate: PBXNativeTarget | undefined =
    targets.find((target) => target.props.productName === productName) ??
    targets[0];

  if (targetToUpdate) {
    warnOnce(
      `Target "${targetToUpdate.props.productName}" already exists, updating instead of creating a new one`
    );
  }

  const magicCwd = path.join(config._internal!.projectRoot, "ios", props.cwd);

  function applyDevelopmentTeamIdToTargets() {
    // Set to the provided value or any value.
    const devTeamId =
      props.teamId ||
      project.rootObject.props.targets
        .map((target) => target.getDefaultBuildSetting("DEVELOPMENT_TEAM"))
        .find(Boolean);

    project.rootObject.props.targets.forEach((target) => {
      if (devTeamId) {
        target.setBuildSetting("DEVELOPMENT_TEAM", devTeamId);
      } else {
        target.removeBuildSetting("DEVELOPMENT_TEAM");
      }
    });

    for (const target of project.rootObject.props.targets) {
      project.rootObject.props.attributes.TargetAttributes ??= {};

      // idk, attempting to prevent EAS Build from failing when it codesigns
      project.rootObject.props.attributes.TargetAttributes[target.uuid] ??= {
        CreatedOnToolsVersion: "14.3",
        ProvisioningStyle: "Automatic",
        DevelopmentTeam: devTeamId,
      };
    }
  }

  function configureTargetWithKnownSettings(target: PBXNativeTarget) {
    if (props.colors?.$accent) {
      target.setBuildSetting(
        "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME",
        "$accent"
      );
    } else {
      target.removeBuildSetting(
        "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME"
      );
    }
    if (props.colors?.$widgetBackground) {
      target.setBuildSetting(
        "ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME",
        "$widgetBackground"
      );
    } else {
      target.removeBuildSetting(
        "ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME"
      );
    }
  }

  function configureTargetWithEntitlements(target: PBXNativeTarget) {
    const entitlements = globSync("*.entitlements", {
      absolute: false,
      cwd: magicCwd,
    });

    if (entitlements.length > 0) {
      target.setBuildSetting(
        "CODE_SIGN_ENTITLEMENTS",
        props.cwd + "/" + entitlements[0]
      );
    } else {
      target.removeBuildSetting("CODE_SIGN_ENTITLEMENTS");
    }

    return entitlements;
    // CODE_SIGN_ENTITLEMENTS = MattermostShare/MattermostShare.entitlements;
  }

  function syncMarketingVersions() {
    const mainVersion = getMainMarketingVersion(project);
    project.rootObject.props.targets.forEach((target) => {
      if (PBXNativeTarget.is(target)) {
        target.setBuildSetting("MARKETING_VERSION", mainVersion);
      }
    });
  }

  function configureTargetWithPreview(target: PBXNativeTarget) {
    const assets = globSync("preview/*.xcassets", {
      absolute: true,
      cwd: magicCwd,
    })[0];

    if (assets) {
      target.setBuildSetting(
        "DEVELOPMENT_ASSET_PATHS",
        `"${props.cwd + "/preview"}"`
      );
    } else {
      target.removeBuildSetting("DEVELOPMENT_ASSET_PATHS");
    }

    return assets;
  }

  function configureJsExport(target: PBXNativeTarget) {
    if (props.exportJs) {
      const shellScript = mainAppTarget.props.buildPhases.find(
        (phase) =>
          PBXShellScriptBuildPhase.is(phase) &&
          phase.props.name === "Bundle React Native code and images"
      ) as PBXShellScriptBuildPhase | undefined;

      if (!shellScript) {
        console.warn(
          'Failed to find the "Bundle React Native code and images" build phase in the main app target. Will not be able to configure: ' +
            props.type
        );
        return;
      }

      const currentShellScript = target.props.buildPhases.find(
        (phase) =>
          PBXShellScriptBuildPhase.is(phase) &&
          phase.props.name === "Bundle React Native code and images"
      ) as PBXShellScriptBuildPhase | undefined;
      if (!currentShellScript) {
        // Link the same build script across targets to simplify updates.
        target.props.buildPhases.push(shellScript);

        // Alternatively, create a duplicate.
        // target.createBuildPhase(PBXShellScriptBuildPhase, {
        //   ...shellScript.props,
        // });
      } else {
        // If there already is a bundler shell script and it's not the one from the main target, then update it.
        if (currentShellScript.uuid !== shellScript.uuid) {
          for (const key in shellScript.props) {
            // @ts-expect-error
            currentShellScript.props[key] = shellScript.props[key];
          }
        }
      }
    } else {
      // Remove the shell script build phase if it exists from a subsequent build.
      const shellScript = target.props.buildPhases.findIndex(
        (phase) =>
          PBXShellScriptBuildPhase.is(phase) &&
          phase.props.name === "Bundle React Native code and images"
      );
      if (shellScript !== -1) {
        target.props.buildPhases.splice(shellScript, 1);
      }
    }
  }

  if (targetToUpdate) {
    // Remove existing build phases
    targetToUpdate.props.buildConfigurationList.props.buildConfigurations.forEach(
      (config) => {
        config.getReferrers().forEach((ref) => {
          ref.removeReference(config.uuid);
        });
        config.removeFromProject();
      }
    );
    // Remove existing build configuration list
    targetToUpdate.props.buildConfigurationList
      .getReferrers()
      .forEach((ref) => {
        ref.removeReference(targetToUpdate!.props.buildConfigurationList.uuid);
      });
    targetToUpdate.props.buildConfigurationList.removeFromProject();

    // Create new build phases
    targetToUpdate.props.buildConfigurationList =
      createConfigurationListForType(project, props);
  } else {
    const productType = productTypeForType(props.type);
    const isExtension = productType === "com.apple.product-type.app-extension";
    const isExtensionKit =
      productType === "com.apple.product-type.extensionkit-extension";

    const appExtensionBuildFile = PBXBuildFile.create(project, {
      fileRef: PBXFileReference.create(project, {
        explicitFileType: isExtensionKit
          ? "wrapper.extensionkit-extension"
          : "wrapper.app-extension",
        includeInIndex: 0,
        path: props.name + (isExtension ? ".appex" : ".app"),
        sourceTree: "BUILT_PRODUCTS_DIR",
      }),
      settings: {
        ATTRIBUTES: ["RemoveHeadersOnCopy"],
      },
    });

    project.rootObject.ensureProductGroup().props.children.push(
      // @ts-expect-error
      appExtensionBuildFile.props.fileRef
    );

    targetToUpdate = project.rootObject.createNativeTarget({
      buildConfigurationList: createConfigurationListForType(project, props),
      name: props.name,
      productName,
      // @ts-expect-error
      productReference:
        appExtensionBuildFile.props.fileRef /* alphaExtension.appex */,
      productType: productType,
    });

    const copyPhase = mainAppTarget.getCopyBuildPhaseForTarget(targetToUpdate);

    if (!copyPhase.getBuildFile(appExtensionBuildFile.props.fileRef)) {
      copyPhase.props.files.push(appExtensionBuildFile);
    }
  }

  configureTargetWithKnownSettings(targetToUpdate);

  configureTargetWithEntitlements(targetToUpdate);

  configureTargetWithPreview(targetToUpdate);

  targetToUpdate.ensureFrameworks(props.frameworks);
  targetToUpdate.getSourcesBuildPhase();
  targetToUpdate.getResourcesBuildPhase();

  configureJsExport(targetToUpdate);

  mainAppTarget.addDependency(targetToUpdate);

  const assetsDir = path.join(magicCwd, "assets");

  // TODO: Maybe just limit this to Safari extensions?
  const explicitFolders: string[] = !fs.existsSync(assetsDir)
    ? []
    : fs
        .readdirSync(assetsDir)
        .filter(
          (file) =>
            file !== ".DS_Store" &&
            fs.statSync(path.join(assetsDir, file)).isDirectory()
        )
        .map((file) => path.join("assets", file));

  const protectedGroup = ensureProtectedGroup(project, path.dirname(props.cwd));

  const sharedAssets = globSync("_shared/*", {
    absolute: false,
    cwd: magicCwd,
  });

  // Also look for global shared assets in the parent targets/_shared directory
  const targetsDir = path.dirname(magicCwd);
  const globalSharedAssets = globSync("_shared/*", {
    absolute: false,
    cwd: targetsDir,
  });

  let syncRootGroup = protectedGroup.props.children.find(
    (child) => child.props.path === path.basename(props.cwd)
  );
  if (!syncRootGroup) {
    syncRootGroup = PBXFileSystemSynchronizedRootGroup.create(project, {
      path: path.basename(props.cwd),
      exceptions: [
        PBXFileSystemSynchronizedBuildFileExceptionSet.create(project, {
          target: targetToUpdate,
          membershipExceptions: [
            // TODO: What other files belong here, why is this here?
            "Info.plist",

            // Exclude the config path
            path.relative(magicCwd, props.configPath),
          ].sort(),
        }),
      ],
      explicitFileTypes: {},
      explicitFolders: [
        // Replaces the previous `lastKnownFileType: "folder",` system that's used in things like Safari extensions to include folders of assets.
        // ex: `"Resources/_locales", "Resources/images"`
        ...explicitFolders,
      ],
      sourceTree: "<group>",
    });

    if (!targetToUpdate.props.fileSystemSynchronizedGroups) {
      targetToUpdate.props.fileSystemSynchronizedGroups = [];
    }
    targetToUpdate.props.fileSystemSynchronizedGroups.push(syncRootGroup);

    protectedGroup.props.children.push(syncRootGroup);
  }

  // If there's a `_shared` folder, create a PBXFileSystemSynchronizedBuildFileExceptionSet and set the `target` to the main app target. Then add exceptions to the new target's PBXFileSystemSynchronizedRootGroup's exceptions. Finally, ensure the relative paths for each file in the _shared folder are added to the `membershipExceptions` array.
  assert(syncRootGroup instanceof PBXFileSystemSynchronizedRootGroup);
  syncRootGroup.props.exceptions ??= [];

  const existingExceptionSet = syncRootGroup.props.exceptions.find(
    (exception) =>
      exception instanceof PBXFileSystemSynchronizedBuildFileExceptionSet &&
      exception.props.target === mainAppTarget
  );
  if (sharedAssets.length) {
    const exceptionSet =
      existingExceptionSet ||
      PBXFileSystemSynchronizedBuildFileExceptionSet.create(project, {
        target: mainAppTarget,
      });
    exceptionSet.props.membershipExceptions = sharedAssets.sort();
    syncRootGroup.props.exceptions.push(exceptionSet);
  } else {
    // Remove the exception set if there are no shared assets.
    existingExceptionSet?.removeFromProject();
  }

  function configureTargetWithGlobalSharedAssets(target: PBXNativeTarget) {
    if (!globalSharedAssets.length) return;

    // Create or find the global shared synchronized root group
    let globalSharedSyncGroup = protectedGroup.props.children.find(
      (child) =>
        child.props.path === "_shared" &&
        child instanceof PBXFileSystemSynchronizedRootGroup
    ) as PBXFileSystemSynchronizedRootGroup | undefined;

    if (!globalSharedSyncGroup) {
      globalSharedSyncGroup = PBXFileSystemSynchronizedRootGroup.create(
        project,
        {
          path: "_shared",
          exceptions: [
            // Create exception set for the main app target
            PBXFileSystemSynchronizedBuildFileExceptionSet.create(project, {
              target: mainAppTarget,
              membershipExceptions: globalSharedAssets.sort(),
            }),
            // Create exception set for the extension target
            PBXFileSystemSynchronizedBuildFileExceptionSet.create(project, {
              target: target,
              membershipExceptions: globalSharedAssets.sort(),
            }),
          ],
          explicitFileTypes: {},
          explicitFolders: [],
          sourceTree: "<group>",
        }
      );

      // Add to both targets' fileSystemSynchronizedGroups
      if (!mainAppTarget.props.fileSystemSynchronizedGroups) {
        mainAppTarget.props.fileSystemSynchronizedGroups = [];
      }
      mainAppTarget.props.fileSystemSynchronizedGroups.push(
        globalSharedSyncGroup
      );

      if (!target.props.fileSystemSynchronizedGroups) {
        target.props.fileSystemSynchronizedGroups = [];
      }
      target.props.fileSystemSynchronizedGroups.push(globalSharedSyncGroup);

      protectedGroup.props.children.push(globalSharedSyncGroup);
    } else {
      // Update existing synchronized group with current global shared assets
      globalSharedSyncGroup.props.exceptions ??= [];

      // Update or create exception set for main app target
      let mainAppExceptionSet = globalSharedSyncGroup.props.exceptions.find(
        (exception) =>
          exception instanceof PBXFileSystemSynchronizedBuildFileExceptionSet &&
          exception.props.target === mainAppTarget
      ) as PBXFileSystemSynchronizedBuildFileExceptionSet | undefined;

      if (!mainAppExceptionSet) {
        mainAppExceptionSet =
          PBXFileSystemSynchronizedBuildFileExceptionSet.create(project, {
            target: mainAppTarget,
            membershipExceptions: globalSharedAssets.sort(),
          });
        globalSharedSyncGroup.props.exceptions.push(mainAppExceptionSet);
      } else {
        mainAppExceptionSet.props.membershipExceptions =
          globalSharedAssets.sort();
      }

      // Update or create exception set for extension target
      let extensionExceptionSet = globalSharedSyncGroup.props.exceptions.find(
        (exception) =>
          exception instanceof PBXFileSystemSynchronizedBuildFileExceptionSet &&
          exception.props.target === target
      ) as PBXFileSystemSynchronizedBuildFileExceptionSet | undefined;

      if (!extensionExceptionSet) {
        extensionExceptionSet =
          PBXFileSystemSynchronizedBuildFileExceptionSet.create(project, {
            target: target,
            membershipExceptions: globalSharedAssets.sort(),
          });
        globalSharedSyncGroup.props.exceptions.push(extensionExceptionSet);
      } else {
        extensionExceptionSet.props.membershipExceptions =
          globalSharedAssets.sort();
      }

      // Ensure the current target has the synchronized group in its fileSystemSynchronizedGroups
      if (!target.props.fileSystemSynchronizedGroups) {
        target.props.fileSystemSynchronizedGroups = [];
      }

      // Check if this target already has the synchronized group
      const hasGroup = target.props.fileSystemSynchronizedGroups.some(
        (group) => group === globalSharedSyncGroup
      );

      if (!hasGroup) {
        target.props.fileSystemSynchronizedGroups.push(globalSharedSyncGroup);
      }
    }
  }

  configureTargetWithGlobalSharedAssets(targetToUpdate);

  applyDevelopmentTeamIdToTargets();
  syncMarketingVersions();
  return project;
}

const PROTECTED_GROUP_NAME = "expo:targets";

function ensureProtectedGroup(
  project: XcodeProject,
  relativePath = "../targets"
) {
  const hasProtectedGroup = project.rootObject.props.mainGroup
    .getChildGroups()
    .find((group) => group.getDisplayName() === PROTECTED_GROUP_NAME);

  const protectedGroup =
    hasProtectedGroup ??
    PBXGroup.create(project, {
      name: PROTECTED_GROUP_NAME,
      path: relativePath,
      sourceTree: "<group>",
    });

  if (!hasProtectedGroup) {
    project.rootObject.props.mainGroup.props.children.unshift(protectedGroup);
  }

  return protectedGroup;
}
