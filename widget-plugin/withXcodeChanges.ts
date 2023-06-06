import { ConfigPlugin } from "@expo/config-plugins";
import {
  PBXBuildFile,
  PBXContainerItemProxy,
  PBXCopyFilesBuildPhase,
  PBXFileReference,
  PBXFrameworksBuildPhase,
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

export type XcodeSettings = {
  name: string;
  /** Directory relative to the project root, (i.e. outside of the `ios` directory) where the widget code should live. */
  cwd: string;

  bundleId: string;
  // 16.4
  deploymentTarget: string;

  // 1
  currentProjectVersion: number;
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

import * as xcode from "@bacons/xcode";

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function isNativeTargetWidget(target: PBXNativeTarget) {
  if (target.props.productType !== "com.apple.product-type.app-extension") {
    return false;
  }
  // Could be a Today Extension, Share Extension, etc.

  const frameworksBuildPhase = target.getBuildPhase(PBXFrameworksBuildPhase);
  const hasSwiftUI = frameworksBuildPhase.props.files.some((buildFile) => {
    return (
      buildFile.props.fileRef.props.name === "SwiftUI.framework" &&
      buildFile.props.fileRef.props.sourceTree === "SDKROOT"
    );
  });
  const hasWidgetKit = frameworksBuildPhase.props.files.some((buildFile) => {
    return (
      buildFile.props.fileRef.props.name === "WidgetKit.framework" &&
      buildFile.props.fileRef.props.sourceTree === "SDKROOT"
    );
  });

  // Surely this is enough to tell.??..
  return hasSwiftUI && hasWidgetKit;

  //  // Unclear if this is enough to determine if it's a widget
  //   const hasWidgetBackgroundColor = target.props.buildConfigurationList.props.buildConfigurations.some(config => {
  //     return 'ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME' in config.props.buildSettings;
  //   })

  //   if (hasWidgetBackgroundColor) {
  //     return true;
  //   }

  //   return target.props.productName?.includes("Widget") ?? false;
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
      // @ts-expect-error
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
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_OPTIMIZATION_LEVEL: "-Onone",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: "1,2",
    },
  });

  const releaseBuildConfig = XCBuildConfiguration.create(project, {
    name: "Release",
    buildSettings: {
      // @ts-expect-error
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
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: "1,2",
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    buildConfigurations: [debugBuildConfig.uuid, releaseBuildConfig.uuid],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });

  return configurationList;
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

  function getExtensionTargets(): PBXNativeTarget[] {
    return project.rootObject.props.targets.filter((target) => {
      return PBXNativeTarget.is(target) && isNativeTargetWidget(target);
    }) as PBXNativeTarget[];
  }

  const targets = getExtensionTargets();

  const productName = props.name + "Extension";

  const targetToUpdate =
    targets.find((target) => target.props.productName === productName) ??
    targets[0];

  if (targetToUpdate) {
    console.log(
      `Widget already "${targetToUpdate.props.productName}" exists, updating instead of creating a new one`
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
      path: "System/Library/Frameworks/" + frameworkName,
    });
  }

  function getOrCreateBuildFile(file: PBXFileReference): PBXBuildFile {
    for (const entry of file.getReferrers()) {
      if (PBXBuildFile.is(entry) && entry.props.fileRef.uuid === file.uuid) {
        return entry;
      }
    }
    return PBXBuildFile.create(project, {
      fileRef: file.uuid,
    });
  }

  // CD07060B2A2EBE2E009C1192 /* WidgetKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WidgetKit.framework; path = System/Library/Frameworks/WidgetKit.framework; sourceTree = SDKROOT; };
  const widgetKitFramework = getFramework("WidgetKit");

  // CD07060D2A2EBE2E009C1192 /* SwiftUI.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = SwiftUI.framework; path = System/Library/Frameworks/SwiftUI.framework; sourceTree = SDKROOT; };
  const swiftUiFramework = getFramework("SwiftUI");

  // Add the widget target to the display folder (cosmetic)
  addFrameworksToDisplayFolder(project, [widgetKitFramework, swiftUiFramework]);

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
    targetToUpdate.props.buildConfigurationList = createConfigurationList(
      project,
      props
    );

    return project;
  }

  // Build Files

  //  CD07060C2A2EBE2E009C1192 /* WidgetKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = CD07060B2A2EBE2E009C1192 /* WidgetKit.framework */; };
  const widgetKitFrameworkBf = getOrCreateBuildFile(widgetKitFramework);
  // 	CD07060E2A2EBE2E009C1192 /* SwiftUI.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = CD07060D2A2EBE2E009C1192 /* SwiftUI.framework */; };
  const swiftUiFrameworkBf = getOrCreateBuildFile(swiftUiFramework);
  // 	CD0706112A2EBE2E009C1192 /* alphaBundle.swift in Sources */ = {isa = PBXBuildFile; fileRef = CD0706102A2EBE2E009C1192 /* alphaBundle.swift */; };
  const alphaBundleSwiftBf = PBXBuildFile.create(project, {
    // CD0706102A2EBE2E009C1192 /* alphaBundle.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = alphaBundle.swift; sourceTree = "<group>"; };
    fileRef: PBXFileReference.create(project, {
      path: "alphaBundle.swift",
      sourceTree: "<group>",
    }).uuid,
  });
  // 	CD0706132A2EBE2E009C1192 /* alphaLiveActivity.swift in Sources */ = {isa = PBXBuildFile; fileRef = CD0706122A2EBE2E009C1192 /* alphaLiveActivity.swift */; };
  const alphaLiveActivitySwiftBf = PBXBuildFile.create(project, {
    // CD0706122A2EBE2E009C1192 /* alphaLiveActivity.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = alphaLiveActivity.swift; sourceTree = "<group>"; };
    fileRef: PBXFileReference.create(project, {
      path: "alphaLiveActivity.swift",
      sourceTree: "<group>",
    }).uuid,
  });
  // 	CD0706152A2EBE2E009C1192 /* index.swift in Sources */ = {isa = PBXBuildFile; fileRef = CD0706142A2EBE2E009C1192 /* index.swift */; };
  const entrySwiftBuildFile = PBXBuildFile.create(project, {
    // CD0706142A2EBE2E009C1192 /* index.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = index.swift; sourceTree = "<group>"; };
    fileRef: PBXFileReference.create(project, {
      path: "index.swift",
      sourceTree: "<group>",
    }).uuid,
  });
  // 	CD0706182A2EBE2F009C1192 /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = CD0706172A2EBE2F009C1192 /* Assets.xcassets */; };
  const assetsXcassetsBf = PBXBuildFile.create(project, {
    // CD0706172A2EBE2F009C1192 /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };
    fileRef: PBXFileReference.create(project, {
      path: "Assets.xcassets",
      sourceTree: "<group>",
    }).uuid,
  });
  // 	CD07061A2A2EBE2F009C1192 /* alpha.intentdefinition in Sources */ = {isa = PBXBuildFile; fileRef = CD0706162A2EBE2E009C1192 /* alpha.intentdefinition */; };
  const alphaIntentdefinitionBf = PBXBuildFile.create(project, {
    // CD0706162A2EBE2E009C1192 /* alpha.intentdefinition */ = {isa = PBXFileReference; lastKnownFileType = file.intentdefinition; path = alpha.intentdefinition; sourceTree = "<group>"; };
    fileRef: PBXFileReference.create(project, {
      // @ts-expect-error
      lastKnownFileType: "file.intentdefinition",
      path: props.name + ".intentdefinition",
      sourceTree: "<group>",
    }).uuid,
  });

  // // 	CD07061B2A2EBE2F009C1192 /* alpha.intentdefinition in Sources */ = {isa = PBXBuildFile; fileRef = CD0706162A2EBE2E009C1192 /* alpha.intentdefinition */; };
  // const alphaIntentdefinitionBf = PBXBuildFile.create(project, {
  //   fileRef: alphaIntentdefinition.uuid,
  // })
  // 	CD07061E2A2EBE2F009C1192 /* alphaExtension.appex in Embed Foundation Extensions */ = {isa = PBXBuildFile; fileRef = CD07060A2A2EBE2E009C1192 /* alphaExtension.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };
  const alphaExtensionAppexBf = PBXBuildFile.create(project, {
    // CD07060A2A2EBE2E009C1192 /* alphaExtension.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = alphaExtension.appex; sourceTree = BUILT_PRODUCTS_DIR; };
    fileRef: PBXFileReference.create(project, {
      explicitFileType: "wrapper.app-extension",
      includeInIndex: 0,
      path: productName + ".appex",
      sourceTree: "BUILT_PRODUCTS_DIR",
    }).uuid,
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
  });

  const widgetTarget = project.rootObject.createNativeTarget({
    buildConfigurationList: createConfigurationList(project, props).uuid,
    name: productName,
    productName: productName,
    productReference:
      alphaExtensionAppexBf.props.fileRef.uuid /* alphaExtension.appex */,
    productType: "com.apple.product-type.app-extension",
  });

  // CD0706062A2EBE2E009C1192
  widgetTarget.createBuildPhase(PBXSourcesBuildPhase, {
    files: [
      entrySwiftBuildFile,
      alphaIntentdefinitionBf,
      alphaBundleSwiftBf,
      alphaLiveActivitySwiftBf,
    ],
    // CD0706152A2EBE2E009C1192 /* index.swift in Sources */,
    // CD07061A2A2EBE2F009C1192 /* alpha.intentdefinition in Sources */,
    // CD0706112A2EBE2E009C1192 /* alphaBundle.swift in Sources */,
    // CD0706132A2EBE2E009C1192 /* alphaLiveActivity.swift in Sources */,
  });

  widgetTarget.createBuildPhase(PBXFrameworksBuildPhase, {
    files: [
      //   CD07060E2A2EBE2E009C1192 /* SwiftUI.framework in Frameworks */,
      swiftUiFrameworkBf,
      //   CD07060C2A2EBE2E009C1192 /* WidgetKit.framework in Frameworks */,
      widgetKitFrameworkBf,
    ],
  });

  widgetTarget.createBuildPhase(PBXResourcesBuildPhase, {
    files: [
      // CD0706182A2EBE2F009C1192 /* Assets.xcassets in Resources */,
      assetsXcassetsBf,
    ],
  });
  const containerItemProxy = PBXContainerItemProxy.create(project, {
    containerPortal: project.rootObject.uuid,
    proxyType: 1,
    remoteGlobalIDString: widgetTarget.uuid,
    remoteInfo: productName,
  });
  // CD07061C2A2EBE2F009C1192 /* PBXContainerItemProxy */ = {
  //   isa = PBXContainerItemProxy;
  //   containerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */;
  //   proxyType = 1;
  //   remoteGlobalIDString = CD0706092A2EBE2E009C1192;
  //   remoteInfo = alphaExtension;
  // };

  const targetDependency = PBXTargetDependency.create(project, {
    target: widgetTarget.uuid,
    targetProxy: containerItemProxy.uuid,
  });
  // CD07061D2A2EBE2F009C1192 /* PBXTargetDependency */ = {
  //   isa = PBXTargetDependency;
  //   target = CD0706092A2EBE2E009C1192 /* alphaExtension */;
  //   targetProxy = CD07061C2A2EBE2F009C1192 /* PBXContainerItemProxy */;
  // };

  // Add the target dependency to the main app, should be only one.
  mainAppTarget.props.dependencies.push(targetDependency);
  // CD07061F2A2EBE2F009C1192 /* Embed Foundation Extensions */ = {
  //   isa = PBXCopyFilesBuildPhase;
  //   buildActionMask = 2147483647;
  //   dstPath = "";
  //   dstSubfolderSpec = 13;
  //   files = (
  //     CD07061E2A2EBE2F009C1192 /* alphaExtension.appex in Embed Foundation Extensions */,
  //   );
  //   name = "Embed Foundation Extensions";
  //   runOnlyForDeploymentPostprocessing = 0;
  // };

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
    // TODO: Idempotent
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
  mainSourcesBuildPhase.props.files.push(alphaIntentdefinitionBf);

  // CD07060F2A2EBE2E009C1192
  project.rootObject.props.mainGroup.createGroup({
    // This is where it gets fancy
    // TODO: The user should be able to know that this is safe to modify and won't be overwritten.
    name: "expo:" + props.name,
    // Like `../alpha`
    path: props.cwd,
    sourceTree: "<group>",
    children: [
      alphaBundleSwiftBf.props.fileRef.uuid,
      alphaLiveActivitySwiftBf.props.fileRef.uuid,
      entrySwiftBuildFile.props.fileRef.uuid,
      alphaIntentdefinitionBf.props.fileRef.uuid,
      assetsXcassetsBf.props.fileRef.uuid,
      // CD0706192A2EBE2F009C1192 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
      PBXFileReference.create(project, {
        path: "Info.plist",
        sourceTree: "<group>",
      }).uuid,
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

  return project;
}
