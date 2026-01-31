# Xcode Target Type Discovery

How to programmatically discover all Apple extension/target types from a local Xcode installation.

## Data Sources Inside Xcode.app

### 1. XCSpec Files (Product Type Definitions)

**Location:**
```
/Applications/Xcode.app/Contents/SharedFrameworks/XCBuild.framework/
  Versions/A/PlugIns/XCBBuildService.bundle/Contents/PlugIns/
  XCBSpecifications.ideplugin/Contents/Resources/
```

**Key files:**
| File | Contents |
|------|----------|
| `DarwinProductTypes.xcspec` | iOS/watchOS/tvOS/visionOS product types |
| `ProductTypes.xcspec` | Generic types (frameworks, libraries, tools) |
| `macOSProductTypes.xcspec` | macOS-specific product types |

**Format:** Binary plist arrays. Each entry has:
- `Identifier` — e.g. `com.apple.product-type.app-extension`
- `BasedOn` — parent type for inheritance
- `Name` / `Description` — human-readable
- `DefaultBuildProperties` — build settings
- `PackageTypes` — associated package type identifiers

**Relevant product types for this project:**
| Identifier | Name |
|-----------|------|
| `com.apple.product-type.application` | Application (used for watch apps) |
| `com.apple.product-type.app-extension` | App Extension (most extension types) |
| `com.apple.product-type.app-extension.messages` | iMessage Extension |
| `com.apple.product-type.app-extension.messages-sticker-pack` | Sticker Pack |
| `com.apple.product-type.application.on-demand-install-capable` | App Clip |
| `com.apple.product-type.extensionkit-extension` | ExtensionKit Extension (e.g. App Intents) |
| `com.apple.product-type.application.watchapp2-container` | Watch-Only App Stub |

### 2. Extension Template Directories

**Location pattern:**
```
/Applications/Xcode.app/Contents/Developer/Platforms/<PLATFORM>/
  Developer/Library/Xcode/Templates/Project Templates/<OS>/Application Extension/
```

**Platforms:**
| Platform dir | OS label | Template count (Xcode 16) |
|-------------|----------|--------------------------|
| `iPhoneOS.platform` | `iOS` | ~60 |
| `MacOSX.platform` | `macOS` | ~33 |
| `WatchOS.platform` | `watchOS` | ~4 |
| `AppleTVOS.platform` | `tvOS` | ~6 |
| `XROS.platform` | `visionOS` | ~26 |

Each extension type is a `<Name>.xctemplate/` directory containing a `TemplateInfo.plist`.

### 3. TemplateInfo.plist Structure

Each template plist contains:

```
Identifier       — unique ID, e.g. "com.apple.dt.unit.widgetExtension.iOS"
Description      — human-readable description
Ancestors        — parent template IDs (inheritance)
Kind             — always "Xcode.Xcode3.ProjectTemplateUnitKind"

Definitions:
  "Info.plist:NSExtension" — XML fragment with NSExtensionPointIdentifier

Options:          — user choices when creating in Xcode (language, sub-types, etc.)
Nodes:            — files included in the template

AssociatedTargetSpecification:
  AllowablePlatforms     — platform identifiers
  AllowableProductTypes  — which product types can host this extension
```

**The key field is `Info.plist:NSExtension`** — it contains the `NSExtensionPointIdentifier` string which is the canonical identifier for the extension type at runtime.

Example (Widget Extension):
```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
</dict>
```

### 4. Special Cases

**Network Extensions** use a single template with a popup option for sub-types:
- `com.apple.networkextension.app-proxy`
- `com.apple.networkextension.dns-proxy`
- `com.apple.networkextension.packet-tunnel`
- `com.apple.networkextension.filter-data`

These are defined inside `Options[].Units{}` in the plist, not at the top-level `Definitions`.

**App Clips** and **Watch Apps** are not in the "Application Extension" template directory — they use different product types (`application.on-demand-install-capable` and `application` respectively) and have their own template locations.

**ExtensionKit extensions** (e.g. App Intents) use `com.apple.product-type.extensionkit-extension` instead of `com.apple.product-type.app-extension`. They use `EXExtensionPointIdentifier` instead of `NSExtensionPointIdentifier`.

## Mapping to @bacons/apple-targets ExtensionType

The project's `ExtensionType` in `packages/apple-targets/src/target.ts` maps to Xcode data as follows:

| ExtensionType | NSExtensionPointIdentifier | Product Type |
|--------------|---------------------------|-------------|
| `widget` | `com.apple.widgetkit-extension` | app-extension |
| `share` | `com.apple.share-services` | app-extension |
| `notification-content` | `com.apple.usernotifications.content-extension` | app-extension |
| `notification-service` | `com.apple.usernotifications.service` | app-extension |
| `intent` | `com.apple.intents-service` | app-extension |
| `intent-ui` | `com.apple.intents-ui-service` | app-extension |
| `spotlight` | `com.apple.spotlight.import` | app-extension |
| `safari` | `com.apple.Safari.web-extension` | app-extension |
| `action` | `com.apple.services` | app-extension |
| `imessage` | `com.apple.message-payload-provider` | app-extension |
| `matter` | `com.apple.matter.support.extension.device-setup` | app-extension |
| `quicklook-thumbnail` | `com.apple.quicklook.thumbnail` | app-extension |
| `bg-download` | `com.apple.background-asset-downloader-extension` | app-extension |
| `location-push` | `com.apple.location.push.service` | app-extension |
| `credentials-provider` | `com.apple.authentication-services-credential-provider-ui` | app-extension |
| `account-auth` | `com.apple.authentication-services-account-authentication-modification-ui` | app-extension |
| `device-activity-monitor` | `com.apple.deviceactivity.monitor-extension` | app-extension |
| `keyboard` | `com.apple.keyboard-service` | app-extension |
| `network-packet-tunnel` | `com.apple.networkextension.packet-tunnel` | app-extension |
| `network-app-proxy` | `com.apple.networkextension.app-proxy` | app-extension |
| `network-dns-proxy` | `com.apple.networkextension.dns-proxy` | app-extension |
| `network-filter-data` | `com.apple.networkextension.filter-data` | app-extension |
| `app-intent` | `com.apple.appintents-extension` | extensionkit-extension |
| `clip` | _(none — uses NSAppClip)_ | application.on-demand-install-capable |
| `watch` | _(none — standalone app)_ | application |

## Scanner Script

See `scripts/scan-xcode-targets.ts` for a Bun script that parses the Xcode templates and xcspec files to produce a machine-readable registry of all available target types.
