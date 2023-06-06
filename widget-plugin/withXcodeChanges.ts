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

  // console.log(
  //   frameworksBuildPhase.props.files.map(
  //     (buildFile) => buildFile.props.fileRef.props
  //   ),
  //   { hasSwiftUI, hasWidgetKit }
  // );
  // Surely this is enough to tell.??..
  return hasSwiftUI && hasWidgetKit;
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
      SWIFT_VERSION: "5",
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
      SWIFT_VERSION: "5",
      TARGETED_DEVICE_FAMILY: "1,2",
    },
  });

  const configurationList = XCConfigurationList.create(project, {
    // @ts-expect-error
    buildConfigurations: [debugBuildConfig, releaseBuildConfig],
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

  function getOrCreateBuildFile(file: PBXFileReference): PBXBuildFile {
    for (const entry of file.getReferrers()) {
      if (PBXBuildFile.is(entry) && entry.props.fileRef.uuid === file.uuid) {
        return entry;
      }
    }
    return PBXBuildFile.create(project, {
      // @ts-expect-error
      fileRef: file,
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

  const magicCwd = path.join(config._internal.projectRoot!, "ios", props.cwd);

  // NOTE: Single-level only
  const swiftFiles = globSync("*.swift", {
    absolute: true,
    cwd: magicCwd,
  }).map((file) => {
    return PBXBuildFile.create(project, {
      // @ts-expect-error
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
      // @ts-expect-error
      lastKnownFileType: "file.intentdefinition",
      path: path.basename(file),
      sourceTree: "<group>",
    });
  });

  const intentBuildFiles = [0, 1].map((_) =>
    intentFiles.map((file) => {
      return PBXBuildFile.create(project, {
        // @ts-expect-error
        fileRef: file,
      });
    })
  );

  // NOTE: Single-level only
  const assetFiles = globSync("*.xcassets", {
    absolute: true,
    cwd: magicCwd,
  }).map((file) => {
    return PBXBuildFile.create(project, {
      // @ts-expect-error
      fileRef: PBXFileReference.create(project, {
        path: path.basename(file),
        sourceTree: "<group>",
      }),
    });
  });

  const alphaExtensionAppexBf = PBXBuildFile.create(project, {
    // @ts-expect-error
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
    // @ts-expect-error
    buildConfigurationList: createConfigurationList(project, props),
    name: productName,
    productName: productName,
    // @ts-expect-error
    productReference:
      alphaExtensionAppexBf.props.fileRef /* alphaExtension.appex */,
    productType: "com.apple.product-type.app-extension",
  });

  // CD0706062A2EBE2E009C1192
  widgetTarget.createBuildPhase(PBXSourcesBuildPhase, {
    files: [...swiftFiles, ...intentBuildFiles[0]],
    // CD0706152A2EBE2E009C1192 /* index.swift in Sources */,
    // CD07061A2A2EBE2F009C1192 /* alpha.intentdefinition in Sources */,
    // CD0706112A2EBE2E009C1192 /* alphaBundle.swift in Sources */,
    // CD0706132A2EBE2E009C1192 /* alphaLiveActivity.swift in Sources */,
  });

  widgetTarget.createBuildPhase(PBXFrameworksBuildPhase, {
    files: [
      getOrCreateBuildFile(swiftUiFramework),
      getOrCreateBuildFile(widgetKitFramework),
    ],
  });

  widgetTarget.createBuildPhase(PBXResourcesBuildPhase, {
    files: assetFiles,
  });
  const containerItemProxy = PBXContainerItemProxy.create(project, {
    // @ts-expect-error
    containerPortal: project.rootObject,
    proxyType: 1,
    remoteGlobalIDString: widgetTarget.uuid,
    remoteInfo: productName,
  });

  const targetDependency = PBXTargetDependency.create(project, {
    // @ts-expect-error
    target: widgetTarget,
    // @ts-expect-error
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

  return project;
}

function ensureProtectedGroup(project: XcodeProject) {
  const hasProtectedGroup = project.rootObject.props.mainGroup
    .getChildGroups()
    .find((group) => group.getDisplayName() === "expo:linked");
  const protectedGroup =
    hasProtectedGroup ??
    PBXGroup.create(project, {
      name: "expo:linked",
      sourceTree: "<group>",
    });

  if (!hasProtectedGroup) {
    let libIndex = project.rootObject.props.mainGroup
      .getChildGroups()
      .findIndex((group) => group.getDisplayName() === "Libraries");
    if (libIndex === -1) {
      libIndex = 0;
    }

    // add above the group named "Libraries"
    project.rootObject.props.mainGroup.props.children.splice(
      libIndex,
      0,
      protectedGroup
    );
  }

  return protectedGroup;
}
