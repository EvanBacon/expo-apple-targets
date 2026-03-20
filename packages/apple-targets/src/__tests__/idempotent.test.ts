import {
  XcodeSettings,
  createConfigurationListForType,
  updateConfigurationListForType,
} from "../configuration-list";

// We can't easily load @bacons/xcode in the Jest test environment due to
// module resolution issues with the .ts source files. Instead, test the
// update function's behavior by mocking the XcodeProject and config list.

// Mock @bacons/xcode
jest.mock("@bacons/xcode", () => {
  class MockXCBuildConfiguration {
    static isa = "XCBuildConfiguration";
    static is(obj: any) {
      return obj?.isa === "XCBuildConfiguration";
    }
    static create(project: any, opts: any) {
      const uuid = `mock-uuid-${opts.name}-${Date.now()}`;
      const instance = new MockXCBuildConfiguration(project, uuid, {
        isa: "XCBuildConfiguration",
        ...opts,
      });
      project.set(uuid, instance);
      return instance;
    }
    uuid: string;
    props: any;
    constructor(_project: any, uuid: string, props: any) {
      this.uuid = uuid;
      this.props = props;
    }
  }

  class MockXCConfigurationList {
    static isa = "XCConfigurationList";
    static create(project: any, opts: any) {
      const uuid = `mock-uuid-configlist-${Date.now()}`;
      const instance = new MockXCConfigurationList(project, uuid, {
        isa: "XCConfigurationList",
        ...opts,
      });
      project.set(uuid, instance);
      return instance;
    }
    uuid: string;
    props: any;
    constructor(_project: any, uuid: string, props: any) {
      this.uuid = uuid;
      this.props = props;
    }
    getDefaultConfiguration() {
      return (
        this.props.buildConfigurations.find(
          (c: any) => c.props.name === "Release"
        ) ?? this.props.buildConfigurations[0]
      );
    }
  }

  return {
    XCBuildConfiguration: MockXCBuildConfiguration,
    XCConfigurationList: MockXCConfigurationList,
    XcodeProject: jest.fn(),
    PBXNativeTarget: { is: () => false },
    PBXBuildFile: { create: jest.fn() },
    PBXFileReference: { create: jest.fn() },
    PBXGroup: { create: jest.fn() },
    PBXCopyFilesBuildPhase: { is: () => false },
    PBXShellScriptBuildPhase: { is: () => false },
    PBXFileSystemSynchronizedRootGroup: { create: jest.fn() },
    PBXFileSystemSynchronizedBuildFileExceptionSet: { create: jest.fn() },
  };
});

// Mock the target module to avoid pulling in more @bacons/xcode deps
jest.mock("../target", () => ({
  getMainAppTarget: jest.fn(),
  isNativeTargetOfType: jest.fn(),
  needsEmbeddedSwift: jest.fn(() => false),
  productTypeForType: jest.fn(() => "com.apple.product-type.app-extension"),
}));

const {
  XCBuildConfiguration,
  XCConfigurationList,
} = require("@bacons/xcode");

function createMockProject() {
  const map = new Map();
  return {
    set: (uuid: string, obj: any) => map.set(uuid, obj),
    get: (uuid: string) => map.get(uuid),
    entries: () => map.entries(),
    rootObject: {
      props: {
        targets: [],
        mainGroup: { getChildGroups: () => [], props: { children: [] } },
        attributes: {},
      },
    },
  };
}

describe("updateConfigurationListForType", () => {
  it("updates build settings in place without creating new objects", () => {
    const project = createMockProject();

    const widgetSettings: XcodeSettings = {
      name: "widgetExtension",
      productName: "widgetExtension",
      cwd: "../targets/widget",
      bundleId: "com.example.widget",
      deploymentTarget: "16.4",
      currentProjectVersion: 1,
      frameworks: ["WidgetKit", "SwiftUI"],
      type: "widget",
      configPath: "/tmp/expo-target.config.json",
    };

    // Create a config list (simulating first prebuild)
    const configList = createConfigurationListForType(
      project as any,
      widgetSettings
    );
    const debugConfig = configList.props.buildConfigurations.find(
      (c: any) => c.props.name === "Debug"
    );
    const releaseConfig = configList.props.buildConfigurations.find(
      (c: any) => c.props.name === "Release"
    );

    // Record the original UUIDs
    const originalConfigListUuid = configList.uuid;
    const originalDebugUuid = debugConfig.uuid;
    const originalReleaseUuid = releaseConfig.uuid;
    const originalDebugDeployTarget =
      debugConfig.props.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;

    expect(originalDebugDeployTarget).toBe("16.4");

    // Now update in place with a different deployment target
    const updatedSettings = {
      ...widgetSettings,
      deploymentTarget: "17.0",
    };

    updateConfigurationListForType(
      project as any,
      configList,
      updatedSettings
    );

    // UUIDs should NOT change
    expect(configList.uuid).toBe(originalConfigListUuid);
    expect(debugConfig.uuid).toBe(originalDebugUuid);
    expect(releaseConfig.uuid).toBe(originalReleaseUuid);

    // But build settings SHOULD be updated
    expect(debugConfig.props.buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(
      "17.0"
    );
    expect(releaseConfig.props.buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(
      "17.0"
    );
  });

  it("preserves UUIDs when settings are unchanged", () => {
    const project = createMockProject();

    const widgetSettings: XcodeSettings = {
      name: "widgetExtension",
      productName: "widgetExtension",
      cwd: "../targets/widget",
      bundleId: "com.example.widget",
      deploymentTarget: "16.4",
      currentProjectVersion: 1,
      frameworks: ["WidgetKit", "SwiftUI"],
      type: "widget",
      configPath: "/tmp/expo-target.config.json",
    };

    // Create the config list
    const configList = createConfigurationListForType(
      project as any,
      widgetSettings
    );

    const debugConfig = configList.props.buildConfigurations.find(
      (c: any) => c.props.name === "Debug"
    );
    const releaseConfig = configList.props.buildConfigurations.find(
      (c: any) => c.props.name === "Release"
    );

    // Snapshot the build settings before update
    const debugSettingsBefore = JSON.stringify(
      debugConfig.props.buildSettings
    );
    const releaseSettingsBefore = JSON.stringify(
      releaseConfig.props.buildSettings
    );

    // Update with same settings
    updateConfigurationListForType(
      project as any,
      configList,
      widgetSettings
    );

    // UUIDs unchanged
    expect(configList.props.buildConfigurations).toHaveLength(2);

    // Settings should be equivalent (content-wise identical)
    expect(JSON.stringify(debugConfig.props.buildSettings)).toBe(
      debugSettingsBefore
    );
    expect(JSON.stringify(releaseConfig.props.buildSettings)).toBe(
      releaseSettingsBefore
    );
  });
});
