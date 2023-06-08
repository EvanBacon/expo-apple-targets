import { ConfigPlugin } from "@expo/config-plugins";
import {
  PBXBuildFile,
  PBXContainerItemProxy,
  PBXCopyFilesBuildPhase,
  PBXFileReference,
  PBXFrameworksBuildPhase,
  PBXGroup,
  PBXNativeTarget,
  PBXProject,
  PBXResourcesBuildPhase,
  PBXSourcesBuildPhase,
  PBXTargetDependency,
  XCBuildConfiguration,
  XCConfigurationList,
  XcodeProject,
} from "@bacons/xcode";
import { ExpoConfig } from "@expo/config";
import { withXcodeProjectBeta } from "./withXcparse";
import { sync as globSync } from "glob";
import path from "path";
import { BuildSettings } from "@bacons/xcode/json";

export type ExtensionType =
  | "widget"
  | "notification-content"
  | "share"
  | "safari";

export type XcodeSettings = {
  name: string;
  /** Directory relative to the project root, (i.e. outside of the `ios` directory) where the widget code should live. */
  cwd: string;

  bundleId: string;
  // 16.4
  deploymentTarget: string;

  // 1
  currentProjectVersion: number;

  frameworks: string[];

  type: ExtensionType;
};

export const withXcodeChanges: ConfigPlugin<XcodeSettings> = (
  config,
  props
) => {
  return withXcodeProjectBeta(config, (config) => {
    applyXcodeChanges(config, config.modResults, props);
    return config;
  });
};

import plist from "@expo/plist";

import fs from "fs";

const KNOWN_EXTENSION_POINT_IDENTIFIERS: Record<string, ExtensionType> = {
  "com.apple.widgetkit-extension": "widget",
  "com.apple.usernotifications.content-extension": "notification-content",
  "com.apple.share-services": "share",
  "com.apple.Safari.web-extension": "safari",
  // "com.apple.intents-service": "intents",
};

function isNativeTargetOfType(
  target: PBXNativeTarget,
  type: ExtensionType
): boolean {
  if (target.props.productType !== "com.apple.product-type.app-extension") {
    return false;
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
    return false;
  }

  return (
    KNOWN_EXTENSION_POINT_IDENTIFIERS[
      infoPlist.NSExtension?.NSExtensionPointIdentifier
    ] === type
  );
}

function intentsInfoPlist() {
  return {
    NSExtension: {
      NSExtensionPointIdentifier: "com.apple.intents-service",
      NSExtensionAttributes: {
        IntentsRestrictedWhileLocked: [
          "INSendMessageIntent",
          "INSearchForMessagesIntent",
          "INSetMessageAttributeIntent",
        ],
      },
      NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).IntentHandler",
    },
  };
}

function notificationServiceInfoPlist() {
  return {
    NSExtension: {
      NSExtensionPointIdentifier: "com.apple.usernotifications.service",
      NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).NotificationService",
    },
  };
}

function createIntentsConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
  }: XcodeSettings
) {
  const common: BuildSettings = {
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: 1,
    DEBUG_INFORMATION_FORMAT: "dwarf",
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    GENERATE_INFOPLIST_FILE: "YES",
    INFOPLIST_FILE: "nando/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    INFOPLIST_KEY_NSHumanReadableCopyright: "",
    IPHONEOS_DEPLOYMENT_TARGET: "16.4",
    LD_RUNPATH_SEARCH_PATHS:
      "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
    MARKETING_VERSION: 1.0,
    MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SKIP_INSTALL: "YES",
    // @ts-expect-error
    SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
  };
  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...common,
      COPY_PHASE_STRIP: "NO",
      DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym",
      SWIFT_OPTIMIZATION_LEVEL: "-Owholemodule",
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
}

function createNotificationServiceConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
  }: XcodeSettings
) {
  const common: BuildSettings = {
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    COPY_PHASE_STRIP: "NO",
    DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym",
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    GENERATE_INFOPLIST_FILE: "YES",
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    INFOPLIST_FILE: cwd + "/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    INFOPLIST_KEY_NSHumanReadableCopyright: "",
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,

    LD_RUNPATH_SEARCH_PATHS:
      "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
    MARKETING_VERSION: 1.0,
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: "-Owholemodule",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
  };
  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
      // Diff
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      // @ts-expect-error
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      SWIFT_OPTIMIZATION_LEVEL: "-Onone",
      DEBUG_INFORMATION_FORMAT: "dwarf",
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      CLANG_ANALYZER_NONNULL: "YES",
      ...common,
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
}

function createShareConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
  }: XcodeSettings
) {
  const common: BuildSettings = {
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    DEBUG_INFORMATION_FORMAT: "dwarf", // NOTE
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    GENERATE_INFOPLIST_FILE: "YES",
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    INFOPLIST_FILE: cwd + "/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    INFOPLIST_KEY_NSHumanReadableCopyright: "",
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
    LD_RUNPATH_SEARCH_PATHS:
      "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
    MARKETING_VERSION: 1.0,
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
  };
  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
      // Diff
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      // @ts-expect-error
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      CLANG_ANALYZER_NONNULL: "YES",
      ...common,
      // Diff
      COPY_PHASE_STRIP: "NO",
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
}
function createSafariConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
  }: XcodeSettings
) {
  const common: BuildSettings = {
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    GENERATE_INFOPLIST_FILE: "YES",
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    INFOPLIST_FILE: cwd + "/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    INFOPLIST_KEY_NSHumanReadableCopyright: "",
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
    LD_RUNPATH_SEARCH_PATHS:
      "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
    MARKETING_VERSION: 1.0,
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
    OTHER_LDFLAGS: [`-framework`, "SafariServices"],
  };

  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
      // Diff
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      // @ts-expect-error
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      DEBUG_INFORMATION_FORMAT: "dwarf", // NOTE
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...common,
      // Diff
      SWIFT_OPTIMIZATION_LEVEL: "-Owholemodule",
      COPY_PHASE_STRIP: "NO",
      DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym",
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
}

function createConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
  }: XcodeSettings
) {
  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
      ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "WidgetBackground",
      CLANG_ANALYZER_NONNULL: "YES",
      CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
      CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
      CLANG_ENABLE_OBJC_WEAK: "YES",
      CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
      CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
      CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: currentProjectVersion,
      DEBUG_INFORMATION_FORMAT: "dwarf",
      GCC_C_LANGUAGE_STANDARD: "gnu11",
      GENERATE_INFOPLIST_FILE: "YES",
      INFOPLIST_FILE: cwd + "/Info.plist",
      INFOPLIST_KEY_CFBundleDisplayName: name,
      INFOPLIST_KEY_NSHumanReadableCopyright: "",
      IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
      LD_RUNPATH_SEARCH_PATHS:
        "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
      MARKETING_VERSION: 1.0,
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      MTL_FAST_MATH: "YES",
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: "$(TARGET_NAME)",
      SKIP_INSTALL: "YES",
      // @ts-expect-error
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_OPTIMIZATION_LEVEL: "-Onone",
      SWIFT_VERSION: "5",
      TARGETED_DEVICE_FAMILY: "1,2",
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
      ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "WidgetBackground",
      CLANG_ANALYZER_NONNULL: "YES",
      CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
      CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
      CLANG_ENABLE_OBJC_WEAK: "YES",
      CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
      CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
      CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
      CODE_SIGN_STYLE: "Automatic",
      COPY_PHASE_STRIP: "NO",
      CURRENT_PROJECT_VERSION: currentProjectVersion,
      DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym",
      GCC_C_LANGUAGE_STANDARD: "gnu11",
      GENERATE_INFOPLIST_FILE: "YES",
      INFOPLIST_FILE: cwd + "/Info.plist",
      INFOPLIST_KEY_CFBundleDisplayName: name,
      INFOPLIST_KEY_NSHumanReadableCopyright: "",
      IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
      LD_RUNPATH_SEARCH_PATHS:
        "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
      MARKETING_VERSION: 1.0,
      MTL_FAST_MATH: "YES",
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: "$(TARGET_NAME)",
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_OPTIMIZATION_LEVEL: "-Owholemodule",
      SWIFT_VERSION: "5",
      TARGETED_DEVICE_FAMILY: "1,2",
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
}

function createConfigurationListForType(
  project: XcodeProject,
  props: XcodeSettings
) {
  if (props.type === "widget") {
    return createConfigurationList(project, props);
  } else if (props.type === "share") {
    return createShareConfigurationList(project, props);
  } else if (props.type === "safari") {
    return createSafariConfigurationList(project, props);
  } else {
    // TODO: More
    return createNotificationServiceConfigurationList(project, props);
  }
}

/** It's common for all frameworks to exist in the top-level "Frameworks" folder that shows in Xcode. */
function addFrameworksToDisplayFolder(
  project: XcodeProject,
  frameworks: PBXFileReference[]
) {
  // TODO: Ensure existence
  let mainFrameworksGroup = project.rootObject.props.mainGroup
    .getChildGroups()
    .find((group) => group.getDisplayName() === "Frameworks");

  // If this happens, there's a big problem. But just in case...
  if (!mainFrameworksGroup) {
    mainFrameworksGroup = project.rootObject.props.mainGroup.createGroup({
      name: "Frameworks",
      sourceTree: "<group>",
    });
  }

  frameworks.forEach((file) => {
    if (
      !mainFrameworksGroup.props.children.find(
        (child) => child.getDisplayName() === file.getDisplayName()
      )
    ) {
      mainFrameworksGroup.props.children.push(file);
    }
  });
}

async function applyXcodeChanges(
  config: ExpoConfig,
  project: XcodeProject,
  props: XcodeSettings
) {
  const mainAppTarget = project.rootObject.getNativeTarget(
    "com.apple.product-type.application"
  );

  // This should never happen.
  if (!mainAppTarget) {
    throw new Error("Couldn't find main application target in Xcode project.");
  }

  // Special setting for share extensions.
  if (props.type === "share") {
    // Add ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES to the main app target
    mainAppTarget.props.buildConfigurationList.props.buildConfigurations.forEach(
      (buildConfig) => {
        // @ts-expect-error
        buildConfig.props.buildSettings.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES =
          "YES";
      }
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

  const productName = props.name + "Extension";

  const targetToUpdate =
    targets.find((target) => target.props.productName === productName) ??
    targets[0];

  if (targetToUpdate) {
    console.log(
      `Widget "${targetToUpdate.props.productName}" already exists, updating instead of creating a new one`
    );
  }

  function getFramework(name: string): PBXFileReference {
    const frameworkName = name + ".framework";
    for (const [, entry] of project.entries()) {
      if (
        PBXFileReference.is(entry) &&
        entry.props.lastKnownFileType === "wrapper.framework" &&
        entry.props.sourceTree === "SDKROOT" &&
        entry.props.name === frameworkName
      ) {
        return entry;
      }
    }
    return PBXFileReference.create(project, {
      explicitFileType: "wrapper.framework",
      sourceTree: "SDKROOT",
      path: "System/Library/Frameworks/" + frameworkName,
    });
  }
  const magicCwd = path.join(config._internal.projectRoot!, "ios", props.cwd);

  function getOrCreateBuildFile(file: PBXFileReference): PBXBuildFile {
    for (const entry of file.getReferrers()) {
      if (PBXBuildFile.is(entry) && entry.props.fileRef.uuid === file.uuid) {
        return entry;
      }
    }
    return PBXBuildFile.create(project, {
      fileRef: file,
    });
  }

  // Add the widget target to the display folder (cosmetic)
  addFrameworksToDisplayFolder(
    project,
    props.frameworks.map((framework) => getFramework(framework))
  );

  function configureTargetWithEntitlements(target: PBXNativeTarget) {
    const entitlements = globSync("*.entitlements", {
      absolute: true,
      cwd: magicCwd,
    }).map((file) => {
      return PBXBuildFile.create(project, {
        fileRef: PBXFileReference.create(project, {
          path: path.basename(file),
          explicitFileType: "text.plist.entitlements",
          sourceTree: "<group>",
        }),
      });
    });

    if (entitlements.length > 0) {
      target.props.buildConfigurationList.props.buildConfigurations.forEach(
        (config) => {
          // @ts-expect-error
          config.props.buildSettings.CODE_SIGN_ENTITLEMENTS =
            props.cwd + "/" + entitlements[0].props.fileRef.props.path;
        }
      );
    } else {
      target.props.buildConfigurationList.props.buildConfigurations.forEach(
        (config) => {
          // @ts-expect-error
          delete config.props.buildSettings.CODE_SIGN_ENTITLEMENTS;
        }
      );
    }

    return entitlements;
    // CODE_SIGN_ENTITLEMENTS = MattermostShare/MattermostShare.entitlements;
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
        ref.removeReference(targetToUpdate.props.buildConfigurationList.uuid);
      });
    targetToUpdate.props.buildConfigurationList.removeFromProject();

    // Create new build phases
    targetToUpdate.props.buildConfigurationList =
      createConfigurationListForType(project, props);

    configureTargetWithEntitlements(targetToUpdate);
    // const group = project.rootObject.props.mainGroup.props.children.find(group => group.props.name === 'expo:' + props.name);
    // if (!PBXGroup.is(group)) {
    //   throw new Error('Could not find expo:' + props.name + ' group');
    // }
    // group.props.path = props.cwd;

    // group.props.children.forEach(child => {

    //   if (child.props.name === 'Info.plist') {
    //     child.props.path = props.cwd + '/Info.plist';
    //   }
    // })

    // children: [
    //   // @ts-expect-error
    //   ...swiftFiles.map((buildFile) => buildFile.props.fileRef),

    //   // @ts-expect-error
    //   ...intentFiles,

    //   // @ts-expect-error
    //   assetsXcassetsBf.props.fileRef,

    //   // CD0706192A2EBE2F009C1192 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
    //   // @ts-expect-error
    //   PBXFileReference.create(project, {
    //     path: "Info.plist",
    //     sourceTree: "<group>",
    //   }),
    // ],

    return project;
  }

  // Build Files

  // NOTE: Single-level only
  const swiftFiles = globSync("*.swift", {
    absolute: true,
    cwd: magicCwd,
  }).map((file) => {
    return PBXBuildFile.create(project, {
      fileRef: PBXFileReference.create(project, {
        path: path.basename(file),
        sourceTree: "<group>",
      }),
    });
  });

  // NOTE: Single-level only
  const intentFiles = globSync("*.intentdefinition", {
    absolute: true,
    cwd: magicCwd,
  }).map((file) => {
    return PBXFileReference.create(project, {
      lastKnownFileType: "file.intentdefinition",
      path: path.basename(file),
      sourceTree: "<group>",
    });
  });

  const intentBuildFiles = [0, 1].map((_) =>
    intentFiles.map((file) => {
      return PBXBuildFile.create(project, {
        fileRef: file,
      });
    })
  );

  let assetFiles = [
    // All assets`
    // "assets/*",
    // NOTE: Single-level only
    "*.xcassets",
  ]
    .map((glob) =>
      globSync(glob, {
        absolute: true,
        cwd: magicCwd,
      }).map((file) => {
        return PBXBuildFile.create(project, {
          fileRef: PBXFileReference.create(project, {
            path: path.basename(file),
            sourceTree: "<group>",
          }),
        });
      })
    )
    .flat();

  const resAssets: PBXBuildFile[] = [];

  // TODO: Maybe just limit this to Safari?
  // get top-level directories in `assets/` and append them to assetFiles as folder types
  fs.readdirSync(path.join(magicCwd, "assets")).forEach((file) => {
    const stat = fs.statSync(path.join(magicCwd, "assets", file));
    if (stat.isDirectory()) {
      resAssets.push(
        PBXBuildFile.create(project, {
          fileRef: PBXFileReference.create(project, {
            path: file,
            sourceTree: "<group>",
            // @ts-expect-error
            explicitFileType: "folder",
          }),
        })
      );
    } else if (stat.isFile()) {
      resAssets.push(
        PBXBuildFile.create(project, {
          fileRef: PBXFileReference.create(project, {
            path: file,
            // @ts-expect-error
            explicitFileType: file.endsWith(".js")
              ? "sourcecode.javascript"
              : file.endsWith(".json")
              ? "text.json"
              : file.endsWith(".html")
              ? "text.html"
              : file.endsWith(".css")
              ? "text.css"
              : "text",
            sourceTree: "<group>",
          }),
        })
      );
    }
  });

  const alphaExtensionAppexBf = PBXBuildFile.create(project, {
    fileRef: PBXFileReference.create(project, {
      explicitFileType: "wrapper.app-extension",
      includeInIndex: 0,
      path: productName + ".appex",
      sourceTree: "BUILT_PRODUCTS_DIR",
    }),
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
  });

  project.rootObject.ensureProductGroup().props.children.push(
    // @ts-expect-error
    alphaExtensionAppexBf.props.fileRef
  );

  const widgetTarget = project.rootObject.createNativeTarget({
    buildConfigurationList: createConfigurationListForType(project, props),
    name: productName,
    productName: productName,
    // @ts-expect-error
    productReference:
      alphaExtensionAppexBf.props.fileRef /* alphaExtension.appex */,
    productType: "com.apple.product-type.app-extension",
  });

  const entitlementFiles = configureTargetWithEntitlements(widgetTarget);

  // CD0706062A2EBE2E009C1192
  widgetTarget.createBuildPhase(PBXSourcesBuildPhase, {
    files: [...swiftFiles, ...intentBuildFiles[0], ...entitlementFiles],
    // CD0706152A2EBE2E009C1192 /* index.swift in Sources */,
    // CD07061A2A2EBE2F009C1192 /* alpha.intentdefinition in Sources */,
    // CD0706112A2EBE2E009C1192 /* alphaBundle.swift in Sources */,
    // CD0706132A2EBE2E009C1192 /* alphaLiveActivity.swift in Sources */,
  });

  widgetTarget.createBuildPhase(PBXFrameworksBuildPhase, {
    files: props.frameworks.map((framework) =>
      getOrCreateBuildFile(getFramework(framework))
    ),
  });

  widgetTarget.createBuildPhase(PBXResourcesBuildPhase, {
    files: [...assetFiles, ...resAssets],
  });
  const containerItemProxy = PBXContainerItemProxy.create(project, {
    containerPortal: project.rootObject,
    proxyType: 1,
    remoteGlobalIDString: widgetTarget.uuid,
    remoteInfo: productName,
  });

  const targetDependency = PBXTargetDependency.create(project, {
    target: widgetTarget,
    targetProxy: containerItemProxy,
  });

  // Add the target dependency to the main app, should be only one.
  mainAppTarget.props.dependencies.push(targetDependency);

  const WELL_KNOWN_COPY_EXTENSIONS_NAME = "Embed Foundation Extensions";
  // Could exist from a Share Extension
  const copyFilesBuildPhase = mainAppTarget.props.buildPhases.find((phase) => {
    if (PBXCopyFilesBuildPhase.is(phase)) {
      // TODO: maybe there's a safer way to do this? The name is not a good identifier.
      return phase.props.name === WELL_KNOWN_COPY_EXTENSIONS_NAME;
    }
  });

  if (copyFilesBuildPhase) {
    // Assume that this is the first run if there is no matching target that we identified from a previous run.
    copyFilesBuildPhase.props.files.push(alphaExtensionAppexBf);
  } else {
    mainAppTarget.createBuildPhase(PBXCopyFilesBuildPhase, {
      buildActionMask: 2147483647,
      dstPath: "",
      dstSubfolderSpec: 13,
      files: [alphaExtensionAppexBf],
      name: WELL_KNOWN_COPY_EXTENSIONS_NAME,
      runOnlyForDeploymentPostprocessing: 0,
    });
  }

  const mainSourcesBuildPhase =
    mainAppTarget.getBuildPhase(PBXSourcesBuildPhase);
  // TODO: Idempotent
  mainSourcesBuildPhase.props.files.push(...intentBuildFiles[1]);

  const protectedGroup = ensureProtectedGroup(project).createGroup({
    // This is where it gets fancy
    // TODO: The user should be able to know that this is safe to modify and won't be overwritten.
    name: path.basename(props.cwd),
    // Like `../alpha`
    path: props.cwd,
    sourceTree: "<group>",
    children: [
      // @ts-expect-error
      ...swiftFiles
        .map((buildFile) => buildFile.props.fileRef)
        .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName())),

      // @ts-expect-error
      ...intentFiles.sort((a, b) =>
        a.getDisplayName().localeCompare(b.getDisplayName())
      ),

      // @ts-expect-error
      ...assetFiles
        .map((buildFile) => buildFile.props.fileRef)
        .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName())),

      // @ts-expect-error
      ...entitlementFiles
        .map((buildFile) => buildFile.props.fileRef)
        .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName())),

      // CD0706192A2EBE2F009C1192 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
      // @ts-expect-error
      PBXFileReference.create(project, {
        path: "Info.plist",
        sourceTree: "<group>",
      }),
    ],
    // children = (
    //   CD0706102A2EBE2E009C1192 /* alphaBundle.swift */,
    //   CD0706122A2EBE2E009C1192 /* alphaLiveActivity.swift */,
    //   CD0706142A2EBE2E009C1192 /* index.swift */,
    //   CD0706162A2EBE2E009C1192 /* alpha.intentdefinition */,
    //   CD0706172A2EBE2F009C1192 /* Assets.xcassets */,
    //   CD0706192A2EBE2F009C1192 /* Info.plist */,
    // );
    // name = "expo:alpha";
    // path = "../alpha";
    // sourceTree = "<group>";
  });

  if (resAssets.length > 0) {
    protectedGroup.createGroup({
      name: "assets",
      path: "assets",
      sourceTree: "<group>",
      // @ts-expect-error
      children: resAssets
        .map((buildFile) => buildFile.props.fileRef)
        .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName())),
    });
  }

  return project;
}

const PROTECTED_GROUP_NAME = "expo:modifiable";

function ensureProtectedGroup(project: XcodeProject) {
  const hasProtectedGroup = project.rootObject.props.mainGroup
    .getChildGroups()
    .find((group) => group.getDisplayName() === PROTECTED_GROUP_NAME);

  const protectedGroup =
    hasProtectedGroup ??
    PBXGroup.create(project, {
      name: PROTECTED_GROUP_NAME,
      sourceTree: "<group>",
    });

  if (!hasProtectedGroup) {
    project.rootObject.props.mainGroup.props.children.unshift(protectedGroup);

    // let libIndex = project.rootObject.props.mainGroup
    //   .getChildGroups()
    //   .findIndex((group) => group.getDisplayName() === "Libraries");
    // if (libIndex === -1) {
    //   libIndex = 0;
    // }
    // add above the group named "Libraries"
    // project.rootObject.props.mainGroup.props.children.splice(
    //   libIndex,
    //   0,
    //   protectedGroup
    // );
  }

  return protectedGroup;
}
