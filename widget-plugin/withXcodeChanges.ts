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

function createConfigurationList(project: XcodeProject) {
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
      CURRENT_PROJECT_VERSION: 1,
      DEBUG_INFORMATION_FORMAT: "dwarf",
      GCC_C_LANGUAGE_STANDARD: "gnu11",
      GENERATE_INFOPLIST_FILE: "YES",
      INFOPLIST_FILE: "../alpha/Info.plist",
      INFOPLIST_KEY_CFBundleDisplayName: "alpha",
      INFOPLIST_KEY_NSHumanReadableCopyright: "",
      IPHONEOS_DEPLOYMENT_TARGET: "16.4",
      LD_RUNPATH_SEARCH_PATHS:
        "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
      MARKETING_VERSION: 1.0,
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      MTL_FAST_MATH: "YES",
      PRODUCT_BUNDLE_IDENTIFIER: "com.bacon.bacon-widget.alpha",
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
      CURRENT_PROJECT_VERSION: 1,
      DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym",
      GCC_C_LANGUAGE_STANDARD: "gnu11",
      GENERATE_INFOPLIST_FILE: "YES",
      INFOPLIST_FILE: "../alpha/Info.plist",
      INFOPLIST_KEY_CFBundleDisplayName: "alpha",
      INFOPLIST_KEY_NSHumanReadableCopyright: "",
      IPHONEOS_DEPLOYMENT_TARGET: "16.4",
      LD_RUNPATH_SEARCH_PATHS:
        "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks",
      MARKETING_VERSION: 1.0,
      MTL_FAST_MATH: "YES",
      PRODUCT_BUNDLE_IDENTIFIER: "com.bacon.bacon-widget.alpha",
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

async function applyXcodeChanges(
  config: ExpoConfig,
  project: XcodeProject,
  { name, cwd }: XcodeSettings
) {
  //   console.log("applyXcodeChanges", project);

  function getExtensionTargets() {
    return project.rootObject.props.targets.filter((target) => {
      return (
        PBXNativeTarget.is(target) &&
        target.props.productType === "com.apple.product-type.app-extension"
      );
    });
  }

  const targets = getExtensionTargets();

  const productName = name + "Extension";

  if (targets.find((target) => target.props.productName === productName)) {
    console.log("Widget already exists, run clean to update settings");
    return;
  } else if (targets.length) {
    // TODO: This can happen safely when there is a Share extension
    console.warn("Widgets already exist, there may be a conflict");
  }

  // CD07060B2A2EBE2E009C1192 /* WidgetKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WidgetKit.framework; path = System/Library/Frameworks/WidgetKit.framework; sourceTree = SDKROOT; };
  const widgetKitFramework = PBXFileReference.create(project, {
    path: "System/Library/Frameworks/WidgetKit.framework",
  });

  // CD07060D2A2EBE2E009C1192 /* SwiftUI.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = SwiftUI.framework; path = System/Library/Frameworks/SwiftUI.framework; sourceTree = SDKROOT; };
  const swiftUiFramework = PBXFileReference.create(project, {
    path: "System/Library/Frameworks/SwiftUI.framework",
  });

  // Build Files

  //  CD07060C2A2EBE2E009C1192 /* WidgetKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = CD07060B2A2EBE2E009C1192 /* WidgetKit.framework */; };
  const widgetKitFrameworkBf = PBXBuildFile.create(project, {
    fileRef: widgetKitFramework.uuid,
  });
  // 	CD07060E2A2EBE2E009C1192 /* SwiftUI.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = CD07060D2A2EBE2E009C1192 /* SwiftUI.framework */; };
  const swiftUiFrameworkBf = PBXBuildFile.create(project, {
    fileRef: swiftUiFramework.uuid,
  });
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
  // 	CD0706152A2EBE2E009C1192 /* alpha.swift in Sources */ = {isa = PBXBuildFile; fileRef = CD0706142A2EBE2E009C1192 /* alpha.swift */; };
  const alphaSwiftBf = PBXBuildFile.create(project, {
    // CD0706142A2EBE2E009C1192 /* alpha.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = alpha.swift; sourceTree = "<group>"; };
    fileRef: PBXFileReference.create(project, {
      path: "alpha.swift",
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
      path: "alpha.intentdefinition",
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
      path: "alphaExtension.appex",
      sourceTree: "BUILT_PRODUCTS_DIR",
    }).uuid,
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
  });

  const nativeTarget = project.rootObject.createNativeTarget({
    buildConfigurationList: createConfigurationList(project).uuid,
    name: "alphaExtension",
    productName: "alphaExtension",
    productReference:
      alphaExtensionAppexBf.props.fileRef.uuid /* alphaExtension.appex */,
    productType: "com.apple.product-type.app-extension",
  });

  // CD0706062A2EBE2E009C1192
  nativeTarget.createBuildPhase(PBXSourcesBuildPhase, {
    files: [
      alphaSwiftBf,
      alphaIntentdefinitionBf,
      alphaBundleSwiftBf,
      alphaLiveActivitySwiftBf,
    ],
    // CD0706152A2EBE2E009C1192 /* alpha.swift in Sources */,
    // CD07061A2A2EBE2F009C1192 /* alpha.intentdefinition in Sources */,
    // CD0706112A2EBE2E009C1192 /* alphaBundle.swift in Sources */,
    // CD0706132A2EBE2E009C1192 /* alphaLiveActivity.swift in Sources */,
  });

  nativeTarget.createBuildPhase(PBXFrameworksBuildPhase, {
    files: [
      //   CD07060E2A2EBE2E009C1192 /* SwiftUI.framework in Frameworks */,
      swiftUiFrameworkBf,
      //   CD07060C2A2EBE2E009C1192 /* WidgetKit.framework in Frameworks */,
      widgetKitFrameworkBf,
    ],
  });

  nativeTarget.createBuildPhase(PBXResourcesBuildPhase, {
    files: [
      // CD0706182A2EBE2F009C1192 /* Assets.xcassets in Resources */,
      assetsXcassetsBf,
    ],
  });

  const containerItemProxy = PBXContainerItemProxy.create(project, {
    containerPortal: project.rootObject.uuid,
    proxyType: 1,
    remoteGlobalIDString: nativeTarget.uuid,
    remoteInfo: "alphaExtension",
  });
  // CD07061C2A2EBE2F009C1192 /* PBXContainerItemProxy */ = {
  //   isa = PBXContainerItemProxy;
  //   containerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */;
  //   proxyType = 1;
  //   remoteGlobalIDString = CD0706092A2EBE2E009C1192;
  //   remoteInfo = alphaExtension;
  // };

  const targetDependency = PBXTargetDependency.create(project, {
    target: nativeTarget.uuid,
    targetProxy: containerItemProxy.uuid,
  });

  // CD07061D2A2EBE2F009C1192 /* PBXTargetDependency */ = {
  //   isa = PBXTargetDependency;
  //   target = CD0706092A2EBE2E009C1192 /* alphaExtension */;
  //   targetProxy = CD07061C2A2EBE2F009C1192 /* PBXContainerItemProxy */;
  // };

  const appNativeTarget = project.rootObject.getNativeTarget(
    "com.apple.product-type.application"
  );
  // TODO: Assert

  // TODO: Idempotent
  appNativeTarget.createBuildPhase(PBXCopyFilesBuildPhase, {
    buildActionMask: 2147483647,
    dstPath: "",
    dstSubfolderSpec: 13,
    files: [alphaExtensionAppexBf],
    name: "Embed Foundation Extensions",
    runOnlyForDeploymentPostprocessing: 0,
  });

  // TODO: Idempotent
  appNativeTarget.props.dependencies.push(targetDependency);
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

  const mainSourcesBuildPhase =
    appNativeTarget.getBuildPhase(PBXSourcesBuildPhase);
  // TODO: Idempotent
  mainSourcesBuildPhase.props.files.push(alphaIntentdefinitionBf);

  // TODO: Ensure existence
  const mainFrameworksGroup = project.rootObject.props.mainGroup
    .getChildGroups()
    .find((group) => group.getDisplayName() === "Frameworks");

  [widgetKitFramework, swiftUiFramework].forEach((file) => {
    if (
      !mainFrameworksGroup.props.children.find(
        (child) => child.getDisplayName() === file.getDisplayName()
      )
    ) {
      mainFrameworksGroup.props.children.push(file);
    }
  });

  // CD07060F2A2EBE2E009C1192
  project.rootObject.props.mainGroup.createGroup({
    // This is where it gets fancy
    name: "expo:alpha",
    path: "../alpha",
    sourceTree: "<group>",
    children: [
      alphaBundleSwiftBf.props.fileRef.uuid,
      alphaLiveActivitySwiftBf.props.fileRef.uuid,
      alphaSwiftBf.props.fileRef.uuid,
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
    //   CD0706142A2EBE2E009C1192 /* alpha.swift */,
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
