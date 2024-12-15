import {
  PBXBuildFile,
  PBXContainerItemProxy,
  PBXCopyFilesBuildPhase,
  PBXFileReference,
  PBXFileSystemSynchronizedBuildFileExceptionSet,
  PBXFileSystemSynchronizedRootGroup,
  PBXGroup,
  PBXNativeTarget,
  PBXShellScriptBuildPhase,
  PBXTargetDependency,
  XCBuildConfiguration,
  XCConfigurationList,
  XcodeProject,
  XCRemoteSwiftPackageReference,
  XCSwiftPackageProductDependency,
} from "@bacons/xcode";
import { BuildSettings } from "@bacons/xcode/json";
import { ExpoConfig } from "@expo/config";
import { ConfigPlugin } from "@expo/config-plugins";
import fs from "fs";
import { sync as globSync } from "glob";
import path from "path";

import { SwiftDependency } from "./config";
import {
  ExtensionType,
  getMainAppTarget,
  isNativeTargetOfType,
  needsEmbeddedSwift,
  productTypeForType,
} from "./target";
import fixture from "./template/XCBuildConfiguration.json";
const TemplateBuildSettings = fixture as unknown as Record<
  string,
  {
    default: BuildSettings;
    release: BuildSettings;
    debug: BuildSettings;
    info: any;
  }
>;
import { withXcodeProjectBeta } from "./withXcparse";

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

  swiftDependencies?: SwiftDependency[];

  hasAccentColor?: boolean;

  colors?: Record<string, string>;

  teamId?: string;

  icon?: string;

  exportJs?: boolean;

  /** File path to the extension config file. */
  configPath: string;
};

export const withXcodeChanges: ConfigPlugin<XcodeSettings> = (
  config,
  props
) => {
  return withXcodeProjectBeta(config, (config) => {
    // @ts-ignore
    applyXcodeChanges(config, config.modResults, props);
    return config;
  });
};

function createNotificationContentConfigurationList(
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
    LD_RUNPATH_SEARCH_PATHS: [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@executable_path/../../Frameworks",
    ],
    MARKETING_VERSION: "1.0",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_COMPILATION_MODE: "wholemodule",
    SWIFT_OPTIMIZATION_LEVEL: "-O",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
  };
  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
      // Diff
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
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

function createExtensionConfigurationListFromTemplate(
  project: XcodeProject,
  // NSExtensionPointIdentifier
  extensionType: string,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
    icon,
  }: XcodeSettings
) {
  if (!TemplateBuildSettings[extensionType]) {
    throw new Error(
      `No template for extension type ${extensionType}. Add it to the xcode project and re-run the generation script.`
    );
  }

  const template = TemplateBuildSettings[extensionType] as {
    default: BuildSettings;
    release: BuildSettings;
    debug: BuildSettings;
  };

  const dynamic: Partial<BuildSettings> = {
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    INFOPLIST_FILE: cwd + "/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
  };

  if (icon) {
    // Add `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;` build settings
    dynamic.ASSETCATALOG_COMPILER_APPICON_NAME = "AppIcon";
  }

  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...template.default,
      ...template.debug,
      ...dynamic,
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...template.default,
      ...template.release,
      ...dynamic,
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
}

function createAppIntentConfigurationList(
  project: XcodeProject,
  { name, cwd, bundleId }: XcodeSettings
) {
  const commonBuildSettings: BuildSettings = {
    // @ts-expect-error
    ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: "YES",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: "1",
    DEBUG_INFORMATION_FORMAT: "dwarf",
    ENABLE_USER_SCRIPT_SANDBOXING: "YES",
    GCC_C_LANGUAGE_STANDARD: "gnu17",
    GENERATE_INFOPLIST_FILE: "YES",
    INFOPLIST_FILE: cwd + "/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    INFOPLIST_KEY_NSHumanReadableCopyright: "",
    IPHONEOS_DEPLOYMENT_TARGET: "17.0",
    LD_RUNPATH_SEARCH_PATHS: [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@executable_path/../../Frameworks",
    ],
    LOCALIZATION_PREFERS_STRING_CATALOGS: "YES",
    MARKETING_VERSION: "1.0",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
  };

  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...commonBuildSettings,
      GCC_PREPROCESSOR_DEFINITIONS: ["DEBUG=1", "$(inherited)"],
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG $(inherited)",
      SWIFT_OPTIMIZATION_LEVEL: "-Onone",
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...commonBuildSettings,
      COPY_PHASE_STRIP: "NO",
      DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym",
      ...({ SWIFT_COMPILATION_MODE: "wholemodule" } as any),
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
    LD_RUNPATH_SEARCH_PATHS: [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@executable_path/../../Frameworks",
    ],
    MARKETING_VERSION: "1.0",
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

function createIMessageConfigurationList(
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
    ASSETCATALOG_COMPILER_APPICON_NAME: "iMessage App Icon",
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
    LD_RUNPATH_SEARCH_PATHS: [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@executable_path/../../Frameworks",
    ],
    MARKETING_VERSION: "1.0",
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
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
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
function createWatchAppConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
    hasAccentColor,
  }: XcodeSettings
) {
  const mainAppTarget = getMainAppTarget(project).getDefaultConfiguration();
  // NOTE: No base Info.plist needed.

  const common: BuildSettings = {
    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",

    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    ENABLE_PREVIEWS: "YES",
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    INFOPLIST_FILE: cwd + "/Info.plist",
    GENERATE_INFOPLIST_FILE: "YES",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    INFOPLIST_KEY_UISupportedInterfaceOrientations:
      "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown",
    INFOPLIST_KEY_WKCompanionAppBundleIdentifier:
      mainAppTarget.props.buildSettings.PRODUCT_BUNDLE_IDENTIFIER,
    // INFOPLIST_KEY_WKCompanionAppBundleIdentifier: "$(BUNDLE_IDENTIFIER)",
    // INFOPLIST_KEY_WKCompanionAppBundleIdentifier: rootBundleId,
    LD_RUNPATH_SEARCH_PATHS: ["$(inherited)", "@executable_path/Frameworks"],
    MARKETING_VERSION: "1.0",
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: "$(TARGET_NAME)",
    SDKROOT: "watchos",
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "4",
    WATCHOS_DEPLOYMENT_TARGET: deploymentTarget ?? "9.4",
    // WATCHOS_DEPLOYMENT_TARGET: 9.4,
  };

  if (hasAccentColor) {
    common.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = "$accent";
  }

  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
      // Diff
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      DEBUG_INFORMATION_FORMAT: "dwarf", // NOTE
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...common,
      // Diff
      SWIFT_COMPILATION_MODE: "wholemodule",
      SWIFT_OPTIMIZATION_LEVEL: "-O",
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
    LD_RUNPATH_SEARCH_PATHS: [
      "$(inherited)",
      "@executable_path/Frameworks",
      "@executable_path/../../Frameworks",
    ],
    MARKETING_VERSION: "1.0",
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
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      DEBUG_INFORMATION_FORMAT: "dwarf", // NOTE
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...common,
      // Diff
      SWIFT_COMPILATION_MODE: "wholemodule",
      SWIFT_OPTIMIZATION_LEVEL: "-O",
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
function createAppClipConfigurationList(
  project: XcodeProject,
  {
    name,
    cwd,
    bundleId,
    deploymentTarget,
    currentProjectVersion,
    hasAccentColor,
  }: XcodeSettings
) {
  // TODO: Unify AppIcon and AccentColor logic
  const dynamic: Partial<BuildSettings> = {
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    INFOPLIST_FILE: cwd + "/Info.plist",
    INFOPLIST_KEY_CFBundleDisplayName: name,
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
    MARKETING_VERSION: "1.0",
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,

    // TODO: Add this later like entitlements

    // DEVELOPMENT_ASSET_PATHS: `\"${cwd}/Preview Content\"`,
  };

  if (hasAccentColor) {
    dynamic.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = "$accent";
  }

  const superCommon: Partial<BuildSettings> = {
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: "gnu++20",
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",

    COPY_PHASE_STRIP: "NO",

    PRODUCT_NAME: "$(TARGET_NAME)",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: "1,2",
  };

  const infoPlist: Partial<BuildSettings> = {
    GENERATE_INFOPLIST_FILE: "YES",
    INFOPLIST_KEY_UIApplicationSceneManifest_Generation: "YES",
    INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents: "YES",
    INFOPLIST_KEY_UILaunchScreen_Generation: "YES",
    INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad:
      "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight",
    INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone:
      "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight",
  };

  // @ts-expect-error
  const common: BuildSettings = {
    ...dynamic,
    ...infoPlist,
    ...superCommon,

    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",

    LD_RUNPATH_SEARCH_PATHS: ["$(inherited)", "@executable_path/Frameworks"],
    MTL_FAST_MATH: "YES",
    ENABLE_PREVIEWS: "YES",
  };

  const debugBuildConfig = XCBuildConfiguration.create(project, {
    name: "Debug",
    buildSettings: {
      ...common,
      SWIFT_OPTIMIZATION_LEVEL: "-Onone",
      // Diff
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      DEBUG_INFORMATION_FORMAT: "dwarf", // NOTE
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      ...common,
      // Diff
      SWIFT_COMPILATION_MODE: "wholemodule",
      SWIFT_OPTIMIZATION_LEVEL: "-O",
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
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "$accent",
      ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "$widgetBackground",
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
      LD_RUNPATH_SEARCH_PATHS: [
        "$(inherited)",
        "@executable_path/Frameworks",
        "@executable_path/../../Frameworks",
      ],
      MARKETING_VERSION: "1.0",
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      MTL_FAST_MATH: "YES",
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: "$(TARGET_NAME)",
      SKIP_INSTALL: "YES",
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
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "$accent",
      ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "$widgetBackground",
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
      LD_RUNPATH_SEARCH_PATHS: [
        "$(inherited)",
        "@executable_path/Frameworks",
        "@executable_path/../../Frameworks",
      ],
      MARKETING_VERSION: "1.0",
      MTL_FAST_MATH: "YES",
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: "$(TARGET_NAME)",
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_COMPILATION_MODE: "wholemodule",
      SWIFT_OPTIMIZATION_LEVEL: "-O",
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
  } else if (props.type === "action") {
    return createExtensionConfigurationListFromTemplate(
      project,
      "com.apple.services",
      props
    );
  } else if (props.type === "share") {
    return createShareConfigurationList(project, props);
  } else if (props.type === "safari") {
    return createSafariConfigurationList(project, props);
  } else if (props.type === "imessage") {
    return createIMessageConfigurationList(project, props);
  } else if (props.type === "clip") {
    return createAppClipConfigurationList(project, props);
  } else if (props.type === "watch") {
    return createWatchAppConfigurationList(project, props);
  } else if (props.type === "app-intent") {
    return createAppIntentConfigurationList(project, props);
  } else {
    // TODO: More
    return createNotificationContentConfigurationList(project, props);
  }
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

  const productName = props.name;

  let targetToUpdate: PBXNativeTarget | undefined =
    targets.find((target) => target.props.productName === productName) ??
    targets[0];

  if (targetToUpdate) {
    console.log(
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
        target.createBuildPhase(PBXShellScriptBuildPhase, {
          ...shellScript.props,
        });
      } else {
        for (const key in shellScript.props) {
          // @ts-expect-error
          currentShellScript.props[key] = shellScript.props[key];
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

  function configureTargetWithSwiftDependencies(target: PBXNativeTarget) {
    // Add Swift Package Dependency
    props.swiftDependencies?.forEach((dependency) => {
      const requirementOptions: { [key: string]: string } = {};

      if (dependency.version) {
        requirementOptions["kind"] = "exactVersion";
        requirementOptions["version"] = dependency.version;
      } else if (dependency.branch) {
        requirementOptions["kind"] = "branch";
        requirementOptions["version"] = dependency.branch;
      } else {
        console.warn(
          `Error adding dependency: ${dependency.name}. No versioning options specified!`
        );
      }

      // Check for project dependency
      const remoteProps = {
        repositoryURL: dependency.repository,
        requirement: {
          branch: dependency.branch,
          kind: "branch",
        },
      };
      const swiftDependency = XCRemoteSwiftPackageReference.create(
        project,
        remoteProps
      );

      const existingPkgReference =
        project.rootObject.props.packageReferences?.find(
          (r) =>
            r instanceof XCRemoteSwiftPackageReference &&
            r.props.repositoryURL === dependency.repository
        ) as XCRemoteSwiftPackageReference | undefined;

      if (existingPkgReference) {
        console.log("Existing PKG Reference");
        // existingPkgReference.removeFromProject();
        existingPkgReference.props.repositoryURL = remoteProps.repositoryURL;
        existingPkgReference.props.requirement = remoteProps.requirement;
      } else {
        if (project.rootObject.props.packageReferences) {
          project.rootObject.props.packageReferences.push(swiftDependency);
        } else {
          project.rootObject.props.packageReferences = [swiftDependency];
        }
      }

      // Add dependency to target
      const existingProductDependency =
        target.props.packageProductDependencies?.find((dep) => {
          return dep.props.productName === dependency.name;
        });

      if (existingProductDependency) {
        // existingProductDependency.removeFromProject();
        existingProductDependency.props.productName = dependency.name;
        existingProductDependency.props.package =
          existingPkgReference ?? swiftDependency;
      } else {
        const packageProduct = XCSwiftPackageProductDependency.create(project, {
          productName: dependency.name,
          package: swiftDependency,
        });
        if (target.props.packageProductDependencies) {
          target.props.packageProductDependencies.push(packageProduct);
        } else {
          target.props.packageProductDependencies = [packageProduct];
        }
      }
    });
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
        path: productName + (isExtension ? ".appex" : ".app"),
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
      name: productName,
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

  configureTargetWithSwiftDependencies(targetToUpdate);

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

  if (
    !protectedGroup.props.children.find(
      (child) => child.props.path === path.basename(props.cwd)
    )
  ) {
    const syncRootGroup = PBXFileSystemSynchronizedRootGroup.create(project, {
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
