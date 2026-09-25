/**
 * Shards for the macOS `xcodebuild` matrix in `.github/workflows/e2e.yml`.
 *
 * Every templated extension type is in exactly one group. `imessage` is
 * omitted on purpose: `TARGET_REGISTRY` marks it `hasNoTemplate`, so there
 * is no Swift source to compile.
 *
 * Live Activities are not a separate target type. The `widget` template's
 * `WidgetLiveActivity.swift` (ActivityKit) is compiled when the `widget`
 * target is built.
 *
 * These builds pass `CODE_SIGNING_ALLOWED=NO` and target the simulator.
 * They verify the target compiles. They do not create provisioning profiles
 * or exercise entitlements Apple only honors on a signed device (Family
 * Controls, Wallet provisioning, Network Extension, App Groups, push,
 * iMessage).
 */
export const TARGET_GROUPS = {
  "widgets-clips-watch": ["widget", "clip", "watch", "watch-widget"],
  "intents-network-screen-time": [
    "app-intent",
    "intent",
    "intent-ui",
    "keyboard",
    "safari",
    "content-blocker",
    "network-app-proxy",
    "network-dns-proxy",
    "network-filter-data",
    "network-packet-tunnel",
    "device-activity-monitor",
    "shield-action",
    "shield-config",
  ],
  "sharing-files-media": [
    "share",
    "action",
    "notification-content",
    "notification-service",
    "broadcast-upload",
    "broadcast-setup-ui",
    "photo-editing",
    "quicklook-preview",
    "quicklook-thumbnail",
    "file-provider",
    "file-provider-ui",
    "spotlight",
    "spotlight-delegate",
    "call-directory",
    "message-filter",
    "unwanted-communication",
  ],
  "system-services": [
    "account-auth",
    "bg-download",
    "credentials-provider",
    "location-push",
    "matter",
    "classkit-context",
    "virtual-conference",
    "print-service",
    "smart-card",
    "authentication-services",
    "wallet",
    "wallet-ui",
  ],
} as const;

export type TargetGroup = keyof typeof TARGET_GROUPS;

export const TARGET_GROUP_NAMES = Object.keys(TARGET_GROUPS) as TargetGroup[];
