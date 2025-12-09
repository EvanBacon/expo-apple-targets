import { ExtensionType } from "./target";

// Shape based on tailwind
// https://tailwindcss.com/docs/customizing-colors
export type DynamicColor = {
  light: string;
  dark?: string;
};

export type Entitlements = Partial<{
  "com.apple.developer.healthkit": boolean;
  "com.apple.developer.healthkit.access": string[];
  /** prefixed with `merchant.` */
  "com.apple.developer.in-app-payments": string[];
  /** prefixed with `iCloud.` */
  "com.apple.developer.icloud-container-identifiers": string[];
  "com.apple.developer.ClassKit-environment": "production" | "development";
  "com.apple.developer.default-data-protection":
    | "NSFileProtectionCompleteUnlessOpen"
    | "NSFileProtectionCompleteUntilFirstUserAuthentication"
    | "NSFileProtectionNone"
    | "NSFileProtectionComplete";
  "com.apple.developer.networking.networkextension": (
    | "dns-proxy"
    | "app-proxy-provider"
    | "content-filter-provider"
    | "packet-tunnel-provider"
    | "dns-proxy-systemextension"
    | "app-proxy-provider-systemextension"
    | "content-filter-provider-systemextension"
    | "packet-tunnel-provider-systemextension"
    | "dns-settings"
    | "app-push-provider"
  )[];
  "com.apple.developer.networking.vpn.api": "allow-vpn"[];
  "com.apple.developer.networking.HotspotConfiguration": boolean;
  "com.apple.developer.kernel.extended-virtual-addressing": boolean;
  "com.apple.developer.homekit": boolean;
  "com.apple.developer.networking.multipath": boolean;
  "com.apple.external-accessory.wireless-configuration": boolean;
  "inter-app-audio": boolean;
  "com.apple.developer.pass-type-identifiers": "$(TeamIdentifierPrefix)*"[];
  "com.apple.developer.user-fonts": ("app-usage" | "system-installation")[];
  "com.apple.developer.devicecheck.appattest-environment":
    | "development"
    | "production";
  "com.apple.developer.nfc.readersession.formats": ("NDEF" | "TAG")[];
  "com.apple.developer.applesignin": "Default"[];
  "com.apple.developer.siri": boolean;
  "com.apple.developer.networking.wifi-info": boolean;
  "com.apple.developer.usernotifications.communication": boolean;
  "com.apple.developer.usernotifications.time-sensitive": boolean;
  "com.apple.developer.group-session": boolean;
  "com.apple.developer.family-controls": boolean;
  "com.apple.developer.authentication-services.autofill-credential-provider": boolean;
  "com.apple.developer.game-center": boolean;
  /** prefixed with `group.` */
  "com.apple.security.application-groups": string[];
  "com.apple.developer.fileprovider.testing-mode": boolean;
  "com.apple.developer.healthkit.recalibrate-estimates": boolean;
  "com.apple.developer.maps": boolean;
  "com.apple.developer.user-management": boolean;
  "com.apple.developer.networking.custom-protocol": boolean;
  "com.apple.developer.system-extension.install": boolean;
  "com.apple.developer.push-to-talk": boolean;
  "com.apple.developer.driverkit.transport.usb": boolean;
  "com.apple.developer.kernel.increased-memory-limit": boolean;
  "com.apple.developer.driverkit.communicates-with-drivers": boolean;
  "com.apple.developer.media-device-discovery-extension": boolean;
  "com.apple.developer.driverkit.allow-third-party-userclients": boolean;
  "com.apple.developer.weatherkit": boolean;
  "com.apple.developer.on-demand-install-capable": boolean;
  "com.apple.developer.parent-application-identifiers": string[];
  "com.apple.developer.driverkit.family.scsicontroller": boolean;
  "com.apple.developer.driverkit.family.serial": boolean;
  "com.apple.developer.driverkit.family.networking": boolean;
  "com.apple.developer.driverkit.family.hid.eventservice": boolean;
  "com.apple.developer.driverkit.family.hid.device": boolean;
  "com.apple.developer.driverkit": boolean;
  "com.apple.developer.driverkit.transport.hid": boolean;
  "com.apple.developer.driverkit.family.audio": boolean;
  "com.apple.developer.shared-with-you": boolean;
  "com.apple.developer.associated-domains": string[];
}>;

export type Config = {
  /**
   * The type of extension to generate.
   * @example "widget"
   */
  type: ExtensionType;

  /** Name of the target. Will default to a sanitized version of the directory name. */
  name?: string;

  /** Optional custom name for `CFBundleDisplayName`. */
  displayName?: string;

  /**
   * Bundle identifier for the target. Will default to a sanitized version of the root project + name.
   * If the specified bundle identifier is prefixed with a dot (.), the bundle identifier will be appended to the main app's bundle identifier.
   **/
  bundleIdentifier?: string;

  /**
   * A local file path or URL to an image asset.
   */
  icon?: string;

  /**
   * A list of additional frameworks to add to the target.
   * @example ["UserNotifications", "Intents"]
   */
  frameworks?: string[];

  /** Deployment iOS version for the target. Defaults to `18.0` */
  deploymentTarget?: string;

  /** Apple team ID to use for signing the target. Defaults to whatever is used in the main App target. */
  appleTeamId?: string;

  /** Optional entitlements to add to the target. */
  entitlements?: Entitlements;

  /**
   * Additional colors to generate in the `Assets.xcassets`. These will be available as `UIColor`s in the native source.
   * @example In Expo config: `colors: { gradient1: { color: "#FF0000", darkColor: "#0000FF" }`
   * @example In Swift: `Color("gradient1")` -> `#FF0000` in light-mode
   */
  colors?: Record<string, string | DynamicColor>;

  /**
   * Additional images to generate in the `Assets.xcassets`. These will be available as `UIImage`s in the native source. The sources can be URLs or local file paths.
   * @example In Expo config: `images: { evan: "https://github.com/evanbacon.png" }`
   * @example In Swift: `Image("evan")` -> `[picture of guy]`
   */
  images?: Record<
    string,
    string | { "1x"?: string; "2x"?: string; "3x"?: string }
  >;

  /** Should the release build export the JS bundle and embed. Intended for App Clips and Share Extensions where you may want to use React Native. */
  exportJs?: boolean;
};

export type ConfigFunction = (
  config: import("expo/config").ExpoConfig
) => Config;
