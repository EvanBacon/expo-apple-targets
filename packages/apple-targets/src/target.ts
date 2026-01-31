import { PBXNativeTarget, XcodeProject } from "@bacons/xcode";

// ---------------------------------------------------------------------------
// Central target registry — single source of truth for all extension types.
// To add a new type, add an entry here. The ExtensionType union, extension
// point ID map, framework list, etc. are all derived from this object.
// ---------------------------------------------------------------------------

export interface TargetDefinition {
  /** Apple NSExtensionPointIdentifier, e.g. "com.apple.widgetkit-extension" */
  extensionPointIdentifier?: string;
  /** Xcode product type. Defaults to "com.apple.product-type.app-extension" */
  productType?: string;
  /** Whether to set ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES. Default: false */
  needsEmbeddedSwift?: boolean;
  /** System frameworks to link. Default: [] */
  frameworks?: readonly string[];
  /** Whether app groups should sync from main target by default. Default: false */
  appGroupsByDefault?: boolean;
  /** If true, type has no Swift template and is excluded from CLI / e2e tests */
  hasNoTemplate?: boolean;
  /** Display name for the create-target CLI */
  displayName: string;
  /** Short description for the create-target CLI */
  description?: string;
}

export const TARGET_REGISTRY = {
  widget: {
    extensionPointIdentifier: "com.apple.widgetkit-extension",
    frameworks: ["WidgetKit", "SwiftUI", "ActivityKit", "AppIntents"],
    appGroupsByDefault: true,
    displayName: "Widget",
    description: "Home screen widget",
  },
  "notification-content": {
    extensionPointIdentifier: "com.apple.usernotifications.content-extension",
    frameworks: ["UserNotifications", "UserNotificationsUI"],
    displayName: "Notification Content",
  },
  "notification-service": {
    extensionPointIdentifier: "com.apple.usernotifications.service",
    displayName: "Notification Service",
  },
  share: {
    extensionPointIdentifier: "com.apple.share-services",
    needsEmbeddedSwift: true,
    appGroupsByDefault: true,
    displayName: "Share Extension",
  },
  intent: {
    extensionPointIdentifier: "com.apple.intents-service",
    needsEmbeddedSwift: true,
    frameworks: ["Intents"],
    displayName: "Siri Intent",
  },
  "bg-download": {
    extensionPointIdentifier:
      "com.apple.background-asset-downloader-extension",
    needsEmbeddedSwift: true,
    appGroupsByDefault: true,
    displayName: "Background Download",
  },
  "intent-ui": {
    extensionPointIdentifier: "com.apple.intents-ui-service",
    needsEmbeddedSwift: true,
    frameworks: ["IntentsUI"],
    displayName: "Siri Intent UI",
  },
  spotlight: {
    extensionPointIdentifier: "com.apple.spotlight.import",
    needsEmbeddedSwift: true,
    displayName: "Spotlight",
  },
  matter: {
    extensionPointIdentifier: "com.apple.matter.support.extension.device-setup",
    needsEmbeddedSwift: true,
    displayName: "Matter",
  },
  "quicklook-thumbnail": {
    extensionPointIdentifier: "com.apple.quicklook.thumbnail",
    needsEmbeddedSwift: true,
    frameworks: ["QuickLookThumbnailing"],
    displayName: "Quicklook Thumbnail",
  },
  imessage: {
    extensionPointIdentifier: "com.apple.message-payload-provider",
    hasNoTemplate: true,
    displayName: "iMessage",
  },
  clip: {
    productType: "com.apple.product-type.application.on-demand-install-capable",
    needsEmbeddedSwift: true,
    appGroupsByDefault: true,
    displayName: "App Clip",
    description: "Instantly open your app without installing",
  },
  watch: {
    productType: "com.apple.product-type.application",
    needsEmbeddedSwift: true,
    displayName: "Watch",
  },
  "location-push": {
    extensionPointIdentifier: "com.apple.location.push.service",
    displayName: "Location Push",
  },
  "credentials-provider": {
    extensionPointIdentifier:
      "com.apple.authentication-services-credential-provider-ui",
    displayName: "Credentials Provider",
  },
  "account-auth": {
    extensionPointIdentifier:
      "com.apple.authentication-services-account-authentication-modification-ui",
    displayName: "Account Auth",
  },
  action: {
    extensionPointIdentifier: "com.apple.services",
    displayName: "Action",
    description: "Headless action that appears in share sheets",
  },
  safari: {
    extensionPointIdentifier: "com.apple.Safari.web-extension",
    displayName: "Safari Extension",
  },
  "app-intent": {
    extensionPointIdentifier: "com.apple.appintents-extension",
    productType: "com.apple.product-type.extensionkit-extension",
    frameworks: ["AppIntents"],
    displayName: "App Intent",
  },
  "device-activity-monitor": {
    extensionPointIdentifier: "com.apple.deviceactivity.monitor-extension",
    frameworks: ["DeviceActivity"],
    displayName: "Device Activity Monitor",
  },
  "network-packet-tunnel": {
    extensionPointIdentifier: "com.apple.networkextension.packet-tunnel",
    needsEmbeddedSwift: true,
    frameworks: ["NetworkExtension"],
    displayName: "Network Extension: Packet Tunnel Provider",
  },
  "network-app-proxy": {
    extensionPointIdentifier: "com.apple.networkextension.app-proxy",
    needsEmbeddedSwift: true,
    frameworks: ["NetworkExtension"],
    displayName: "Network Extension: App Proxy",
  },
  "network-filter-data": {
    extensionPointIdentifier: "com.apple.networkextension.filter-data",
    needsEmbeddedSwift: true,
    frameworks: ["NetworkExtension"],
    displayName: "Network Extension: Filter Data",
  },
  "network-dns-proxy": {
    extensionPointIdentifier: "com.apple.networkextension.dns-proxy",
    needsEmbeddedSwift: true,
    frameworks: ["NetworkExtension"],
    displayName: "Network Extension: DNS Proxy",
  },
  keyboard: {
    extensionPointIdentifier: "com.apple.keyboard-service",
    needsEmbeddedSwift: true,
    appGroupsByDefault: true,
    displayName: "Keyboard Extension",
    description: "Custom system keyboard",
  },
  "content-blocker": {
    extensionPointIdentifier: "com.apple.Safari.content-blocker",
    displayName: "Content Blocker",
    description: "Safari content blocker extension",
  },
  "file-provider": {
    extensionPointIdentifier: "com.apple.fileprovider-nonui",
    frameworks: ["UniformTypeIdentifiers"],
    appGroupsByDefault: true,
    displayName: "File Provider",
  },
  "broadcast-upload": {
    extensionPointIdentifier: "com.apple.broadcast-services-upload",
    frameworks: ["ReplayKit"],
    displayName: "Broadcast Upload",
  },
  "call-directory": {
    extensionPointIdentifier: "com.apple.callkit.call-directory",
    frameworks: ["CallKit"],
    displayName: "Call Directory",
  },
  "message-filter": {
    extensionPointIdentifier: "com.apple.identitylookup.message-filter",
    frameworks: ["IdentityLookup"],
    displayName: "Message Filter",
  },
} as const satisfies Record<string, TargetDefinition>;

export type ExtensionType = keyof typeof TARGET_REGISTRY;

// ---------------------------------------------------------------------------
// Derived maps — kept as exports for backward compatibility. All sourced
// from TARGET_REGISTRY so they never go out of sync.
// ---------------------------------------------------------------------------

/** Maps Apple extension point identifiers to ExtensionType values. */
export const KNOWN_EXTENSION_POINT_IDENTIFIERS: Record<
  string,
  ExtensionType
> = Object.fromEntries(
  (
    Object.entries(TARGET_REGISTRY) as [ExtensionType, TargetDefinition][]
  )
    .filter(([, def]) => def.extensionPointIdentifier)
    .map(([type, def]) => [def.extensionPointIdentifier, type])
) as Record<string, ExtensionType>;

/** Whether app groups should sync from the main target by default. */
export const SHOULD_USE_APP_GROUPS_BY_DEFAULT: Record<
  ExtensionType,
  boolean
> = Object.fromEntries(
  (Object.keys(TARGET_REGISTRY) as ExtensionType[]).map((type) => [
    type,
    getEntry(type).appGroupsByDefault ?? false,
  ])
) as Record<ExtensionType, boolean>;

// ---------------------------------------------------------------------------
// Helper functions — signatures unchanged for backward compatibility.
// ---------------------------------------------------------------------------

function getEntry(type: ExtensionType): TargetDefinition {
  return TARGET_REGISTRY[type];
}

export function productTypeForType(type: ExtensionType): string {
  return getEntry(type).productType ?? "com.apple.product-type.app-extension";
}

export function needsEmbeddedSwift(type: ExtensionType): boolean {
  return getEntry(type).needsEmbeddedSwift ?? false;
}

export function getFrameworksForType(type: ExtensionType): string[] {
  return [...(getEntry(type).frameworks ?? [])];
}

// ---------------------------------------------------------------------------
// Info.plist generation — stays as a switch because each type has a unique
// plist shape that can't be reasonably data-driven.
// ---------------------------------------------------------------------------

// TODO: Maybe we can replace `NSExtensionPrincipalClass` with the `@main` annotation that newer extensions use?
export function getTargetInfoPlistForType(type: ExtensionType) {
  const NSExtensionPointIdentifier = getEntry(type).extensionPointIdentifier;

  switch (type) {
    case "watch":
      return {};
    case "action":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            NSExtensionActivationRule: {
              NSExtensionActivationSupportsFileWithMaxCount: 0,
              NSExtensionActivationSupportsImageWithMaxCount: 0,
              NSExtensionActivationSupportsMovieWithMaxCount: 0,
              NSExtensionActivationSupportsText: false,
              NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            },
            NSExtensionJavaScriptPreprocessingFile: "assets/index",
            NSExtensionServiceAllowsFinderPreviewItem: true,
            NSExtensionServiceAllowsTouchBarItem: true,
            NSExtensionServiceFinderPreviewIconName: "NSActionTemplate",
            NSExtensionServiceTouchBarBezelColorName: "TouchBarBezel",
            NSExtensionServiceTouchBarIconName: "NSActionTemplate",
          },
          NSExtensionPointIdentifier: "com.apple.services",
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).ActionRequestHandler",
        },
      };
    case "app-intent":
      return {
        EXAppExtensionAttributes: {
          EXExtensionPointIdentifier: "com.apple.appintents-extension",
        },
      };
    case "clip":
      return {
        CFBundleName: "$(PRODUCT_NAME)",
        CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)",
        CFBundleVersion: "$(CURRENT_PROJECT_VERSION)",
        CFBundleExecutable: "$(EXECUTABLE_NAME)",
        CFBundlePackageType: "$(PRODUCT_BUNDLE_PACKAGE_TYPE)",
        CFBundleShortVersionString: "$(MARKETING_VERSION)",
        UIApplicationSupportsIndirectInputEvents: true,
        NSAppClip: {
          NSAppClipRequestEphemeralUserNotification: false,
          NSAppClipRequestLocationConfirmation: false,
        },
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: true,
        },
        UILaunchStoryboardName: "SplashScreen",
        UIUserInterfaceStyle: "Automatic",
        UIViewControllerBasedStatusBarAppearance: false,
      };
    case "imessage":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          // This is hardcoded as there is no Swift code in the imessage extension.
          NSExtensionPrincipalClass: "StickerBrowserViewController",
        },
      };
    case "account-auth":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,

          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).AccountAuthViewController",

          NSExtensionAttributes: {
            ASAccountAuthenticationModificationSupportsStrongPasswordChange:
              true,
            ASAccountAuthenticationModificationSupportsUpgradeToSignInWithApple:
              true,
          },
        },
      };
    case "credentials-provider":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).CredentialProviderViewController",
        },
      };
    case "keyboard":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).KeyboardViewController",
          NSExtensionAttributes: {
            RequestsOpenAccess: false,
            IsASCIICapable: false,
            PrefersRightToLeft: false,
            PrimaryLanguage: "en-US",
          },
        },
      };
    case "content-blocker":
      return {
        NSExtension: {
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).ContentBlockerRequestHandler",
          NSExtensionPointIdentifier,
        },
      };
    case "notification-service":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            NSExtensionActivationRule: "TRUEPREDICATE",
          },
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).NotificationService",
          NSExtensionPointIdentifier,
        },
      };
    case "quicklook-thumbnail":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            QLSupportedContentTypes: [],
            QLThumbnailMinimumDimension: 0,
          },
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).ThumbnailProvider",
          NSExtensionPointIdentifier,
        },
      };
    case "spotlight":
      return {
        CSExtensionLabel: "myImporter",
        NSExtension: {
          NSExtensionAttributes: {
            CSSupportedContentTypes: ["com.example.plain-text"],
          },
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).ImportExtension",
          NSExtensionPointIdentifier,
        },
      };
    case "share":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            NSExtensionActivationRule: "TRUEPREDICATE",
          },
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).ShareViewController",
          NSExtensionPointIdentifier,
        },
      };
    case "intent-ui":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            IntentsSupported: ["INSendMessageIntent"],
          },
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).IntentViewController",
          NSExtensionPointIdentifier,
        },
      };
    case "intent":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            IntentsRestrictedWhileLocked: [],
            IntentsSupported: [
              "INSendMessageIntent",
              "INSearchForMessagesIntent",
              "INSetMessageAttributeIntent",
            ],
          },
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).IntentHandler",
          NSExtensionPointIdentifier,
        },
      };
    case "matter":
      return {
        NSExtension: {
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).RequestHandler",
          NSExtensionPointIdentifier,
        },
      };
    case "location-push":
      return {
        NSExtension: {
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).LocationPushService",
          NSExtensionPointIdentifier,
        },
      };
    case "safari":
      return {
        NSExtension: {
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).SafariWebExtensionHandler",
          NSExtensionPointIdentifier,
        },
      };
    case "notification-content":
      return {
        NSExtension: {
          NSExtensionAttributes: {
            UNNotificationExtensionCategory: "myNotificationCategory",
            UNNotificationExtensionInitialContentSizeRatio: 1,
          },
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).NotificationViewController",
          NSExtensionPointIdentifier,
        },
      };
    case "network-packet-tunnel":
      return {
        NSExtension: {
          NSExtensionPointIdentifier:
            "com.apple.networkextension.packet-tunnel",
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).PacketTunnelProvider",
        },
      };
    case "network-app-proxy":
      return {
        NSExtension: {
          NSExtensionPointIdentifier: "com.apple.networkextension.app-proxy",
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).AppProxyProvider",
        },
      };
    case "network-dns-proxy":
      return {
        NSExtension: {
          NSExtensionPointIdentifier: "com.apple.networkextension.dns-proxy",
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).DNSProxyProvider",
        },
      };
    case "network-filter-data":
      return {
        NSExtension: {
          NSExtensionPointIdentifier: "com.apple.networkextension.filter-data",
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).FilterDataProvider",
        },
      };
    case "file-provider":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).FileProviderExtension",
          NSExtensionFileProviderSupportsEnumeration: true,
        },
      };
    case "broadcast-upload":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).SampleHandler",
          RPBroadcastProcessMode: "RPBroadcastProcessModeSampleBuffer",
        },
      };
    case "call-directory":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).CallDirectoryHandler",
        },
      };
    case "message-filter":
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
          NSExtensionPrincipalClass:
            "$(PRODUCT_MODULE_NAME).MessageFilterExtension",
        },
      };
    default:
      // Default: used for widget and bg-download
      return {
        NSExtension: {
          NSExtensionPointIdentifier,
        },
      };
  }
}

// ---------------------------------------------------------------------------
// Target detection & utilities
// ---------------------------------------------------------------------------

export function isNativeTargetOfType(
  target: PBXNativeTarget,
  type: ExtensionType
): boolean {
  if (
    type === "watch" &&
    target.props.productType === "com.apple.product-type.application"
  ) {
    return (
      "WATCHOS_DEPLOYMENT_TARGET" in
      target.getDefaultConfiguration().props.buildSettings
    );
  }
  if (
    type === "clip" &&
    target.props.productType ===
      "com.apple.product-type.application.on-demand-install-capable"
  ) {
    return true;
  }
  if (target.props.productType !== "com.apple.product-type.app-extension") {
    return false;
  }
  // Could be a Today Extension, Share Extension, etc.

  const infoPlist = target.getDefaultConfiguration().getInfoPlist();

  if (!infoPlist.NSExtension?.NSExtensionPointIdentifier) {
    console.error(
      "No NSExtensionPointIdentifier found in extension Info.plist for target: " +
        target.getDisplayName()
    );
    return false;
  }

  const identifier = infoPlist.NSExtension.NSExtensionPointIdentifier;
  const mappedType = KNOWN_EXTENSION_POINT_IDENTIFIERS[identifier];

  return mappedType === type;
}

export function getMainAppTarget(project: XcodeProject): PBXNativeTarget {
  const target = project.rootObject.getMainAppTarget("ios");
  if (!target) {
    throw new Error("No main app target found");
  }
  return target;
}

export function getAuxiliaryTargets(project: XcodeProject): PBXNativeTarget[] {
  const mainTarget = project.rootObject.getMainAppTarget("ios");
  return project.rootObject.props.targets.filter((target) => {
    return target.uuid !== mainTarget?.uuid;
  }) as PBXNativeTarget[];
}
