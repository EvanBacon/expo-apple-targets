import type { PBXNativeTarget } from "@bacons/xcode";

import { isNativeTargetOfType } from "../target";

function mockTarget({
  productType,
  productName,
  infoPlist = {},
  buildSettings = {},
}: {
  productType: string;
  productName: string;
  infoPlist?: Record<string, any>;
  buildSettings?: Record<string, any>;
}): PBXNativeTarget {
  return {
    props: { productType, productName },
    getDefaultConfiguration: () => ({
      props: { buildSettings },
      getInfoPlist: () => infoPlist,
    }),
    getDisplayName: () => productName,
  } as unknown as PBXNativeTarget;
}

describe(isNativeTargetOfType, () => {
  it("matches an ExtensionKit extension by EXExtensionPointIdentifier", () => {
    const target = mockTarget({
      productType: "com.apple.product-type.extensionkit-extension",
      productName: "myintents",
      infoPlist: {
        EXAppExtensionAttributes: {
          EXExtensionPointIdentifier: "com.apple.appintents-extension",
        },
      },
    });

    expect(isNativeTargetOfType(target, "app-intent")).toBe(true);
  });

  it("does not match an ExtensionKit extension against an NSExtension-based type", () => {
    const target = mockTarget({
      productType: "com.apple.product-type.extensionkit-extension",
      productName: "myintents",
      infoPlist: {
        EXAppExtensionAttributes: {
          EXExtensionPointIdentifier: "com.apple.appintents-extension",
        },
      },
    });

    expect(isNativeTargetOfType(target, "widget")).toBe(false);
  });

  it("falls back to product name matching when an ExtensionKit extension has no extension point identifier", () => {
    const target = mockTarget({
      productType: "com.apple.product-type.extensionkit-extension",
      productName: "app-intent",
    });

    expect(isNativeTargetOfType(target, "app-intent")).toBe(true);
  });

  it("does not match an ExtensionKit extension without identifier or matching name", () => {
    const target = mockTarget({
      productType: "com.apple.product-type.extensionkit-extension",
      productName: "myintents",
    });

    expect(isNativeTargetOfType(target, "app-intent")).toBe(false);
  });

  it("still matches a classic app extension by NSExtensionPointIdentifier", () => {
    const target = mockTarget({
      productType: "com.apple.product-type.app-extension",
      productName: "mywidget",
      infoPlist: {
        NSExtension: {
          NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
        },
      },
    });

    expect(isNativeTargetOfType(target, "widget")).toBe(true);
  });
});
