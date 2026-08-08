import { isNativeTargetOfType } from "../target";

// Minimal mock of PBXNativeTarget for isNativeTargetOfType tests
function createMockTarget(productType: string, buildSettings: Record<string, any> = {}, infoPlist: any = {}) {
  return {
    props: {
      productType,
    },
    getDefaultConfiguration() {
      return {
        props: { buildSettings },
        getInfoPlist() {
          return infoPlist;
        },
      };
    },
  } as any;
}

describe("isNativeTargetOfType", () => {
  it("detects extensionkit-extension targets as app-intent type", () => {
    const target = createMockTarget(
      "com.apple.product-type.extensionkit-extension"
    );
    expect(isNativeTargetOfType(target, "app-intent")).toBe(true);
  });

  it("does not match extensionkit-extension targets as widget type", () => {
    const target = createMockTarget(
      "com.apple.product-type.extensionkit-extension"
    );
    expect(isNativeTargetOfType(target, "widget")).toBe(false);
  });

  it("detects widget targets via extension point identifier", () => {
    const target = createMockTarget(
      "com.apple.product-type.app-extension",
      {},
      {
        NSExtension: {
          NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
        },
      }
    );
    expect(isNativeTargetOfType(target, "widget")).toBe(true);
  });

  it("detects watch app targets via WATCHOS_DEPLOYMENT_TARGET", () => {
    const target = createMockTarget(
      "com.apple.product-type.application",
      { WATCHOS_DEPLOYMENT_TARGET: "9.4" }
    );
    expect(isNativeTargetOfType(target, "watch")).toBe(true);
  });

  it("does not match iOS app targets as watch type", () => {
    const target = createMockTarget(
      "com.apple.product-type.application",
      {}
    );
    expect(isNativeTargetOfType(target, "watch")).toBe(false);
  });
});
