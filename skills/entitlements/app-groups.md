---
title: App Groups Entitlement
description: Share data between your main app, extensions, and App Clips using shared containers and UserDefaults.
version: iOS 8.0+, macOS 10.10+
---

# App Groups Entitlement

App Groups enable multiple application targets within the same developer account to share data via a common container directory and shared UserDefaults. The entitlement grants read/write access to a shared file system location and keychain access group, allowing your main app, extensions (widgets, share extensions, notification service extensions, etc.), and App Clips to exchange files, preferences, databases, and credentials.

## Apple Documentation

- [App Groups Entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups) -- official entitlement reference covering configuration and usage.
- [Sharing Data with Your Containing App](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionScenarios.html#//apple_ref/doc/uid/TP40014214-CH21-SW6) -- Apple's guide to using App Groups for extension-to-app communication.
- [FileManager.containerURL(forSecurityApplicationGroupIdentifier:)](https://developer.apple.com/documentation/foundation/filemanager/1412643-containerurl) -- returns the shared container directory for a given group identifier.
- [UserDefaults(suiteName:)](https://developer.apple.com/documentation/foundation/userdefaults/1409957-init) -- creates a UserDefaults instance backed by a shared App Group.
- [Keychain Services](https://developer.apple.com/documentation/security/keychain_services) -- with `kSecAttrAccessGroup`, allows keychain items to be shared across targets.

## WWDC History

- **[WWDC 2014, Session 205 -- Creating Extensions for iOS and OS X, Part 1](https://developer.apple.com/videos/play/wwdc2014/205/)** -- introduced app extensions and the App Groups entitlement for sharing data between the extension and containing app.
- **[WWDC 2014, Session 217 -- Creating Extensions for iOS and OS X, Part 2](https://developer.apple.com/videos/play/wwdc2014/217/)** -- covered data flow patterns using App Groups with `NSUserDefaults(suiteName:)` and shared file containers.
- **[WWDC 2015, Session 224 -- App Extension Best Practices](https://developer.apple.com/videos/play/wwdc2015/224/)** -- best practices for managing shared data, file coordination, and avoiding conflicts when multiple processes access the same App Group container.
- **[WWDC 2020, Session 10174 -- Explore App Clips](https://developer.apple.com/videos/play/wwdc2020/10174/)** -- demonstrated using App Groups to migrate data from an App Clip to the full app after installation.

## What It Does

1. **Developer configures the entitlement.** You add the `com.apple.security.application-groups` key to each target's entitlements file with an array of group identifiers (e.g., `["group.com.example.myapp"]`).
2. **System provisions the entitlement.** When you build and sign the app, Apple's provisioning profile validates that your developer account owns the App Group identifiers and grants access to the shared containers.
3. **Shared container is created.** On first launch, the system creates a directory at `~/Library/Group Containers/<group-id>/` (iOS/macOS) accessible to all targets sharing that group.
4. **Apps and extensions read/write.** Any target with the entitlement can use `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)` to locate the directory and `UserDefaults(suiteName:)` to access shared preferences.
5. **Data persists across uninstall.** Unlike the main app's container, the App Group container is **not** deleted when the main app is uninstalled if another app on the device still uses the same group. When the last app using the group is removed, the system deletes the container.
6. **Keychain sharing.** Using `kSecAttrAccessGroup` in keychain queries, you can store credentials (passwords, tokens) in a shared keychain access group matching the App Group identifier, accessible from all targets.

## Standard Naming Format

Apple requires App Group identifiers to start with `group.` followed by a reverse-DNS-style identifier matching your team's conventions:

```
group.<bundle-identifier-prefix>
```

### Examples

| App Bundle ID | Recommended App Group ID | Notes |
|---------------|-------------------------|-------|
| `com.example.myapp` | `group.com.example.myapp` | Simplest convention: same as bundle ID with `group.` prefix |
| `com.example.myapp` | `group.com.example` | Shared across multiple apps from the same developer |
| `com.acme.fitness` | `group.com.acme.fitness.shared` | Explicitly named for multi-target sharing |
| `com.company.prod.ios` | `group.com.company.prod` | Production environment-specific group |

**Best practice:** Use `group.<your-bundle-id>` for single-app projects. For multi-app suites (e.g., a family of fitness apps), use a shared prefix like `group.com.company` so all apps can access the same data.

## Common Use Cases

### Widget Extension Sharing Data with Main App

A weather app stores the current forecast in a shared UserDefaults so the widget can display it without making a separate network request. When the app fetches new data, it writes to the App Group and calls `WidgetCenter.shared.reloadTimelines(ofKind:)` to trigger a widget refresh.

### Share Extension Saving Content

A read-later app uses a share extension to receive URLs from Safari. The extension writes the URL and page title to a JSON file in the shared container, then enqueues a background upload task. The main app reads the file on next launch and imports the saved articles.

### Notification Service Extension Decrypting Messages

A messaging app encrypts push notification payloads end-to-end. The encryption keys are stored in the shared keychain using `kSecAttrAccessGroup`. The notification service extension retrieves the key from the keychain, decrypts the payload, and replaces the notification content before display.

### App Clip Migrating User Data

A restaurant ordering App Clip saves the user's favorite items and authentication token to the shared App Group container. When the user installs the full app, the app reads the container on first launch and imports the saved data, providing a seamless transition.

## How to Use App Groups

### 1. Configure the Entitlement in Expo Config

Add the App Groups entitlement to your Expo app configuration. This applies to the main app target.

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.example.myapp"
        ]
      }
    },
    "plugins": [
      ["@bacons/apple-targets"]
    ]
  }
}
```

### 2. Automatic Syncing for Extensions (Default Behavior)

For extension types that commonly need App Groups (`widget`, `share`, `clip`, `bg-download`), the `@bacons/apple-targets` plugin **automatically syncs** the App Group identifiers from the main app to the extension **unless you override them manually**.

**Automatic syncing applies to these types:**
- `widget` (WidgetKit extensions)
- `share` (Share extensions)
- `clip` (App Clips)
- `bg-download` (Background Download extensions)

The plugin checks the `appGroupsByDefault` flag in the target registry (see `packages/apple-targets/src/target.ts`). If `true` and you haven't defined `entitlements["com.apple.security.application-groups"]` in your `expo-target.config.js`, the extension inherits the main app's groups.

**Example console output:**
```
[widgets] Syncing app groups with main app. Define entitlements["com.apple.security.application-groups"] in the expo-target.config file to override.
```

### 3. Manual Override in Extension Config

To use a **different** App Group for a specific extension (or to add App Groups to an extension type that doesn't sync by default), define the entitlement in the extension's `expo-target.config.js`:

```js
// targets/widgets/expo-target.config.js
module.exports = {
  type: "widget",
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.example.widgets-only"
    ]
  }
};
```

This overrides the automatic sync behavior for that target.

### 4. Access Shared UserDefaults

Use `UserDefaults(suiteName:)` to read/write preferences shared between the app and extension:

```swift
import Foundation

// In both your main app and extension:
let sharedDefaults = UserDefaults(suiteName: "group.com.example.myapp")

// Write from the main app
sharedDefaults?.set("Sample Value", forKey: "shared_key")
sharedDefaults?.synchronize()  // Not required on modern iOS, but harmless

// Read from the widget extension
if let value = sharedDefaults?.string(forKey: "shared_key") {
    print("Shared value: \(value)")
}
```

**Important:** The suite name **must exactly match** one of the App Group identifiers in your entitlements. Case-sensitive.

### 5. Access Shared File Container

Use `FileManager.containerURL(forSecurityApplicationGroupIdentifier:)` to get the shared directory:

```swift
import Foundation

guard let containerURL = FileManager.default.containerURL(
    forSecurityApplicationGroupIdentifier: "group.com.example.myapp"
) else {
    fatalError("App Group container not accessible. Check entitlements.")
}

let sharedFileURL = containerURL.appendingPathComponent("data.json")

// Write a file from the main app
let data = try JSONEncoder().encode(myModel)
try data.write(to: sharedFileURL, options: .atomic)

// Read the file from the extension
let readData = try Data(contentsOf: sharedFileURL)
let decodedModel = try JSONDecoder().decode(MyModel.self, from: readData)
```

**Directory structure:**
```
~/Library/Group Containers/group.com.example.myapp/
  Library/
    Preferences/
      group.com.example.myapp.plist   (UserDefaults suite)
    Caches/
    Application Support/
  Documents/
  tmp/
```

### 6. Share Keychain Items

To share passwords, tokens, or certificates between targets, use the `kSecAttrAccessGroup` attribute:

```swift
import Security

let accessGroup = "group.com.example.myapp"

// Save a keychain item (from the main app)
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "user@example.com",
    kSecAttrAccessGroup as String: accessGroup,
    kSecValueData as String: "my-secret-token".data(using: .utf8)!
]
let status = SecItemAdd(query as CFDictionary, nil)

// Retrieve from the extension
let searchQuery: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "user@example.com",
    kSecAttrAccessGroup as String: accessGroup,
    kSecReturnData as String: true
]
var result: AnyObject?
let searchStatus = SecItemCopyMatching(searchQuery as CFDictionary, &result)

if searchStatus == errSecSuccess,
   let data = result as? Data,
   let token = String(data: data, encoding: .utf8) {
    print("Retrieved token: \(token)")
}
```

**Note:** On macOS, keychain access groups require a slightly different format: `<TeamID>.<group-id>`. On iOS, use the App Group identifier directly.

## EAS Build and Automatic Code Signing

When using EAS Build, the `@bacons/apple-targets` plugin automatically exports each extension's bundle identifier and entitlements to the `extra.eas.build.experimental.ios.appExtensions` array in the Expo config. EAS reads this metadata and provisions the necessary certificates, provisioning profiles, and App Group identifiers **without manual configuration**.

### How It Works

1. **Plugin scans the Xcode project** after `expo prebuild` and extracts all extension targets, their bundle identifiers, and entitlements (including App Groups).
2. **Config is updated** with the `withAutoEasExtensionCredentials` config plugin, which adds an entry like:

```json
{
  "extra": {
    "eas": {
      "build": {
        "experimental": {
          "ios": {
            "appExtensions": [
              {
                "targetName": "widgets",
                "bundleIdentifier": "com.example.myapp.widgets",
                "entitlements": {
                  "com.apple.security.application-groups": [
                    "group.com.example.myapp"
                  ]
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

3. **EAS Build provisions App Groups.** When you run `eas build`, the build service:
   - Registers the App Group identifier (`group.com.example.myapp`) in your Apple Developer account if it doesn't already exist.
   - Creates or updates provisioning profiles for the main app and each extension, including the App Group entitlement.
   - Signs each target with the correct profile.

4. **No manual Apple Developer Portal work required.** You do not need to manually create App Group identifiers, add them to App IDs, or regenerate provisioning profiles. EAS handles everything automatically.

### Manual EAS Configuration (Optional)

If you need fine-grained control or are not using `expo prebuild`, you can manually define the `appExtensions` array in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "build": {
          "experimental": {
            "ios": {
              "appExtensions": [
                {
                  "targetName": "widgets",
                  "bundleIdentifier": "com.example.myapp.widgets",
                  "entitlements": {
                    "com.apple.security.application-groups": [
                      "group.com.example.myapp"
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

This is typically unnecessary when using `@bacons/apple-targets`, as the plugin populates it automatically.

## Verifying App Groups are Configured

After running `npx expo prebuild`, check the generated entitlements files:

```sh
# Main app entitlements
cat ios/YourApp/YourApp.entitlements

# Extension entitlements
cat targets/widgets/widgets.entitlements
```

Both should contain:

```xml
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.example.myapp</string>
</array>
```

You can also inspect the EAS metadata:

```sh
npx expo config --type introspect | jq '.extra.eas.build.experimental.ios.appExtensions'
```

## Debugging App Groups

### Common Issues

**"App Group container returns nil"**
- The entitlement is missing from the target's `.entitlements` file.
- The provisioning profile does not include the App Group entitlement (rebuild with EAS or regenerate manually in Xcode).
- The App Group identifier in code does not match the one in the entitlements (case-sensitive).

**"UserDefaults writes from the app are not visible in the extension"**
- Both targets must use the **exact same** suite name.
- Call `.synchronize()` after writing (though not strictly required on iOS 14+, it forces an immediate flush).
- The extension process may be cached; kill the extension process using Xcode's Debug > Attach to Process by PID or Name, or restart the device.

**"Shared file writes from one target cause crashes in another"**
- Use `NSFileCoordinator` for concurrent file access when multiple processes might read/write the same file simultaneously.
- Prefer SQLite with WAL mode (`PRAGMA journal_mode=WAL;`) for databases accessed by multiple processes.

**"Data is not migrating from App Clip to full app"**
- Verify the App Clip and full app have identical App Group identifiers in their entitlements.
- The App Clip's bundle ID must start with the full app's bundle ID (e.g., `com.example.myapp.clip` is a child of `com.example.myapp`).

### Logging and Inspection

**Print the container path at runtime:**
```swift
if let url = FileManager.default.containerURL(
    forSecurityApplicationGroupIdentifier: "group.com.example.myapp"
) {
    print("App Group container: \(url.path)")
} else {
    print("App Group container is nil! Check entitlements.")
}
```

**On device (iOS Simulator or macOS):**
Navigate to the logged path in Terminal:
```sh
open ~/Library/Developer/CoreSimulator/Devices/<UUID>/data/Containers/Shared/AppGroup/<UUID>/
```

**Inspect UserDefaults plist:**
```sh
plutil -p ~/Library/Group\ Containers/group.com.example.myapp/Library/Preferences/group.com.example.myapp.plist
```

## Platform Availability

| Platform | Minimum OS | Notes |
|----------|-----------|-------|
| iOS | 8.0+ | Full support for app extensions and App Clips. |
| iPadOS | 8.0+ | Same as iOS. |
| macOS | 10.10+ | Supported. Keychain access groups require `<TeamID>.<group-id>` format. |
| watchOS | 2.0+ | Supported. Use for Watch Connectivity data sync or standalone watch apps. |
| tvOS | 9.0+ | Supported (rare use case -- extensions are limited on tvOS). |
| visionOS | 1.0+ | Supported. |

## Gotchas

- **App Group IDs are global to your team.** Once you register `group.com.example.myapp` in the Apple Developer Portal under your team, you cannot delete it. You can disable it on specific App IDs, but the identifier remains reserved. Choose carefully.

- **Case sensitivity matters.** `group.com.example.MyApp` and `group.com.example.myapp` are **different** identifiers. Always use lowercase to avoid mismatches.

- **The `group.` prefix is mandatory.** Attempting to use `com.example.myapp` without the `group.` prefix will cause entitlement validation to fail during code signing.

- **UserDefaults suite name must match exactly.** `UserDefaults(suiteName: "group.com.example.myapp")` only works if `"group.com.example.myapp"` is in the entitlements array. Typographical errors silently create a separate, unshared defaults store.

- **File protection levels affect background access.** Files created in the App Group container inherit the default protection level (`NSFileProtectionCompleteUntilFirstUserAuthentication`). Background extensions (notification service, widget timeline providers) run while the device is locked, so files with `NSFileProtectionComplete` are inaccessible. Use `.completeUntilFirstUserAuthentication` or `.noFileProtection` for shared data accessed from background contexts.

- **Data is NOT automatically migrated.** Adding an App Group entitlement to an existing app does not move data from the app's private container to the shared container. You must write migration code on first launch that copies files from the old location to the new one.

- **Multiple apps can share the same group.** If you publish multiple apps under the same developer account, they can all use `group.com.example.shared` to exchange data. This is intentional but can create privacy issues if sensitive data is exposed to unintended apps. Scope your group identifiers to prevent accidental sharing.

- **App Group containers are not deleted when one app is removed.** If you have two apps using the same group and the user uninstalls one, the container remains. This can lead to unexpectedly large storage usage. The container is only deleted when **all** apps using it are uninstalled.

- **Core Data shared stores require NSPersistentContainer configuration.** When using Core Data across multiple processes, initialize `NSPersistentContainer` with a custom store URL pointing to the App Group container, and enable history tracking (`NSPersistentHistoryTrackingKey`) to merge changes between processes.

- **Simulator vs. device paths differ.** On the simulator, the App Group container is at `~/Library/Developer/CoreSimulator/...`. On a physical device, it is in a sandboxed location invisible from macOS Finder. Use Xcode's Devices and Simulators window > Download Container to inspect device data.

- **TestFlight and App Store builds use different provisioning profiles.** If your development build works but TestFlight does not, the TestFlight provisioning profile may be missing the App Group entitlement. Rebuild the profile in EAS or manually via the Apple Developer Portal.

- **Entitlements mismatch between targets breaks EAS Build.** If your main app has `["group.A", "group.B"]` but your widget only has `["group.A"]`, EAS provisions both groups for the main app profile and only `group.A` for the widget. This is correct behavior, but if you later add `group.B` to the widget manually, you must re-sync the EAS metadata or the build will fail.

## Example: Full Integration

**app.json:**
```json
{
  "expo": {
    "slug": "myapp",
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.example.myapp"
        ]
      }
    },
    "plugins": [
      ["@bacons/apple-targets"]
    ]
  }
}
```

**targets/widgets/expo-target.config.js:**
```js
module.exports = {
  type: "widget",
  name: "Widgets"
  // App Groups will be auto-synced from the main app
};
```

**Main app writes data:**
```swift
// ContentView.swift (main app)
import SwiftUI

struct ContentView: View {
    var body: some View {
        Button("Save Data") {
            let sharedDefaults = UserDefaults(suiteName: "group.com.example.myapp")
            sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "last_update")
            sharedDefaults?.set("Hello from main app!", forKey: "message")

            // Trigger widget reload
            #if canImport(WidgetKit)
            import WidgetKit
            WidgetCenter.shared.reloadAllTimelines()
            #endif
        }
    }
}
```

**Widget reads data:**
```swift
// WidgetBundle.swift (widget extension)
import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: .now, message: "Placeholder")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.example.myapp")
        let message = sharedDefaults?.string(forKey: "message") ?? "No data"
        let entry = SimpleEntry(date: .now, message: message)
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct WidgetEntryView: View {
    var entry: SimpleEntry

    var body: some View {
        Text(entry.message)
            .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct MyWidget: Widget {
    let kind = "MyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("Shows data from the main app")
        .supportedFamilies([.systemSmall])
    }
}
```

**Build and test:**
```sh
npx expo prebuild --clean
npx expo run:ios
# Tap "Save Data" in the app, then add the widget to the home screen
```

The widget displays "Hello from main app!" read from the shared UserDefaults.

## Additional Resources

- **Official Apple Sample Code:** [Today Extension (Legacy)](https://developer.apple.com/library/archive/samplecode/Today/Introduction/Intro.html) -- demonstrates sharing `NSUserDefaults` via App Groups.
- **WWDC 2020 Lab Notes:** [App Clips and Data Sharing](https://developer.apple.com/videos/play/wwdc2020/10120/) -- covers App Group best practices for App Clip-to-app migration.
- **Expo Documentation:** [iOS Entitlements](https://docs.expo.dev/versions/latest/config/app/#entitlements) -- how to configure entitlements in `app.json`.
- **EAS Build Documentation:** [App Extensions and EAS Build](https://docs.expo.dev/build-reference/app-extensions/) -- experimental support for app extensions and automatic credential provisioning.
