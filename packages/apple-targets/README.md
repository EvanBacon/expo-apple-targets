# Apple Targets plugin

> [!WARNING]
> This is highly experimental and not part of any official Expo workflow.

<img width="1061" alt="Screenshot 2023-06-10 at 1 59 26 PM" src="https://github.com/EvanBacon/expo-apple-targets/assets/9664363/4cd8399d-53aa-401a-9caa-3a1432a0640c">

An experimental Expo Config Plugin that generates native Apple Targets like Widgets or App Clips, and links them outside the `/ios` directory. You can open Xcode and develop the targets inside the virtual `expo:targets` folder and the changes will be saved outside of the `ios` directory. This pattern enables building things that fall outside of the scope of React Native while still obtaining all the benefits of Continuous Native Generation.

## 🚀 How to use

> This plugin requires at least CocoaPods 1.16.2 (ruby 3.2.0), Xcode 16 (macOS 15 Sequoia), and Expo SDK +52.

1. Run `npx create-target` in your Expo project to generate an Apple target.
2. Select a target to generate, I recommend starting with a `widget` (e.g. `npx create-target widget`). This will generate the required widget files in the root `/targets` directory, install `@bacons/apple-targets`, and add the Expo Config Plugin to your project.
3. If you already know your Apple Team ID, then set it under the `ios.appleTeamId` property in your `app.json`. You can find this in Xcode under the Signing & Capabilities tab and set it later if needed.
4. Run `npx expo prebuild -p ios --clean` to generate the Xcode project.
5. You can now open your project in Xcode (`xed ios`) and develop the widget inside the `expo:targets/<target>` folder.
6. When you're ready to build, select the target in Xcode and build it.

### How it works

The root `/targets` folder is magic, each sub-directory should have a `expo-target.config.js` file that defines the target settings. When you run `npx expo prebuild --clean`, the plugin will generate the Xcode project and link the target files to the project. The plugin will also generate an `Info.plist` file if one doesn't exist.

The Config Plugin will link the subfolder (e.g. `targets/widget`) to Xcode, and all files inside of it will be part of the target. This means you can develop the target inside the `expo:targets` folder and the changes will be saved outside of the generated `ios` directory.

The root `Info.plist` file in each target directory is not managed and can be freely modified.

Any files in a top-level `target/{name}/assets` directory will be linked as resources of the target. This rule was added to support Safari Extensions.

### Entitlements

If the `expo-target.config` file defines an `entitlements: {}` object, then a `generated.entitlements` will be added. Avoid using this file directly, and instead update the `expo-target.config.js` file. If the `entitlements` object is not defined, you can manually add any top-level `*.entitlements` file to the target directory—re-running `npx expo prebuild` will link this file to the target as the entitlements file. Only one top-level `*.entitlements` file is supported per target.

Some targets have special entitlements behavior:

- App Clips (`clip`) automatically set the required `com.apple.developer.parent-application-identifiers` to `$(AppIdentifierPrefix)${config.ios.bundleIdentifier}`
- Targets that can utilize App Groups will automatically mirror the `ios.entitlements['com.apple.security.application-groups']` array from the `app.json` if it's defined. This can be overwritten by specifying an `entitlements['com.apple.security.application-groups']` array in the `expo-target.config.js` file.

### Development

Any changes you make outside of the `expo:targets` directory in Xcode are subject to being overwritten by the next `npx expo prebuild --clean`. Check to see if the settings you want to toggle are available in the Info.plist or the `expo-target.config.js` file.
If you modify the `expo-target.config.js` or your root `app.json`, you will need to re-run `npx expo prebuild --clean` to sync the changes.

You can use the custom Prebuild template `--template node_modules/@bacons/apple-targets/prebuild-blank.tgz` to create a build without React Native, this can make development a bit faster since there's less to compile. This is an advanced technique for development **NOT PRODUCTION** and is not intended to be used with third-party Config Plugins.

## Target config

The target config can be a `expo-target.config.js`, or `expo-target.config.json` file.

This file can have the following properties:

```js
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",

  // Name of the target/product. Defaults to the directory name.
  name: "My Widget",

  // Generates colorset files for the target.
  colors: {
    // or "$accent": "red",
    $accent: { color: "red", darkColor: "blue" },
  },
  icon: "../assets/icon.png",
  // Can also be a URL
  frameworks: [
    // Frameworks with or without the `.frameworks` extension, these will be added to the target.
    "SwiftUI",
  ],
  entitlements: {
    // Serialized entitlements. Useful for configuring with environment variables.
  },
  // Generates xcassets for the target.
  images: {
    thing: "../assets/thing.png",
  },

  // The iOS version fot the target. Defaults to 18.0
  deploymentTarget: "15.1",

  // Optional bundle identifier for the target. Will default to a sanitized version of the root project bundle id + target name.
  // If the specified bundle identifier is prefixed with a dot (.), the bundle identifier will be appended to the main app's bundle identifier.
  bundleIdentifier: ".mywidget",

  // Should the release build export the JS bundle and embed. Intended for App Clips and Share Extensions where you may want to use React Native.
  exportJs: false,
};
```

You can also return a function that accepts the Expo Config and returns a target function for syncing entitlements and other values:

```js
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  colors: {
    $accent: "steelblue",
  },
  entitlements: {
    // Use the same app groups:
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
    // Or generate an app group:
    "com.apple.security.application-groups": [
      `group.${config.ios.bundleIdentifier}.widget`,
    ],
  },
});
```

> ESM and TypeScript are not supported in the target config. Stick to `require` for sharing variables across targets.

## Colors

There are certain values that are shared across targets. We use a predefined convention to map these values across targets.

| Name                | Build Setting                                        | Purpose                                                                                                      |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `$accent`           | `ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME`     | Sets the global accent color, in widgets this is used for the tint color of buttons when editing the widget. |
| `$widgetBackground` | `ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME` | Sets the background color of the widget.                                                                     |

## CocoaPods

Adding a file `pods.rb` in the root of the repo will enable you to modify the target settings for the project.

The ruby module evaluates with global access to the property `podfile_properties`.

For example, the following is useful for enabling React Native in an App Clip target:

```rb
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

exclude = []
use_expo_modules!(exclude: exclude)

if ENV['EXPO_USE_COMMUNITY_AUTOLINKING'] == '1'
  config_command = ['node', '-e', "process.argv=['', '', 'config'];require('@react-native-community/cli').run()"];
else
  config_command = [
    'node',
    '--no-warnings',
    '--eval',
    'require(require.resolve(\'expo-modules-autolinking\', { paths: [require.resolve(\'expo/package.json\')] }))(process.argv.slice(1))',
    'react-native-config',
    '--json',
    '--platform',
    'ios'
  ]
end

config = use_native_modules!(config_command)

use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']

use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
  # An absolute path to your application root.
  :app_path => "#{Pod::Config.instance.installation_root}/..",
  :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
)
```

This block executes at the end of the Podfile in a block like:

```rb
target "target_dir_name" do
   target_file
end
```

The name of the target must match the name of the target directory.

## `_shared`

Some files are required to be linked to both your target and the main target. To support this, you can add a top-level `_shared` directory. Any file in this directory will be linked to both the main target and the sub-target. You'll need to re-run prebuild every time you add, rename, or remove a file in this directory.

## `exportJs`

The `exportJs` option should be used when the target uses React Native (App Clip, Share extension). It works by linking the main target's `Bundle React Native code and images` build phase to the target. This will ensure that production builds (`Release`) bundle the main JS entry file with Metro, and embed the bundle/assets for offline use.

To detect which target is being built, you can read the bundle identifier using `expo-application`.

## Examples

### `widget`

> I wrote a blog about this one and used it in production. Learn more: [Expo x Apple Widgets](https://evanbacon.dev/blog/apple-home-screen-widgets).

```js
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  icon: "../../icons/widget.png",
  colors: {
    // This color is referenced in the Info.plist
    $widgetBackground: "#DB739C",

    $accent: "#F09458",

    // Optional: Add colors that can be used in SwiftUI.
    gradient1: {
      light: "#E4975D",
      dark: "#3E72A0",
    },
  },
  // Optional: Add images that can be used in SwiftUI.
  images: {
    valleys: "../../valleys.png",
  },
  // Optional: Add entitlements to the target, this one can be used to share data between the widget and the app.
  entitlements: {
    "com.apple.security.application-groups": ["group.bacon.data"],
  },
};
```

### `action`

![IMG_C2C825ACC8C7-1](https://github.com/user-attachments/assets/8378e022-2061-4da8-9c46-efe3064dd40c)

These show up in the share sheet. The icon should be transparent as it will be masked by the system.

```js
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "action",
  name: "Inspect Element",
  icon: "./assets/icon.png",
  colors: {
    TouchBarBezel: "#DB739C",
  },
};
```

Add a JavaScript file to `assets/index.js`:

```js
class Action {
  /**
   * `extensionName: "com.bacon.2095.axun"`
   * @param {*} arguments: {completionFunction: () => unknown; extensionName: string; }
   */
  run({ extensionName, completionFunction }) {
    // Here, you can run code that modifies the document and/or prepares
    // things to pass to your action's native code.

    // We will not modify anything, but will pass the body's background
    // style to the native code.
    completionFunction({
      /* */
    });
  }

  finalize() {
    // Runs after the native action code has completed.
  }
}

window.ExtensionPreprocessingJS = new Action();
```

Ensure `NSExtensionJavaScriptPreprocessingFile: "index"` in the Info.plist.

### `spotlight`

Populate the Spotlight search results with your app's content.

```js
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "spotlight",
};
```

### Supported types

Ideally, this would be generated automatically based on a fully qualified Xcode project, but for now it's a manual process. The currently supported types are based on static analysis of the most commonly used targets in the iOS App Store. I haven't tested all of these and they may not work.

| Type                    | Description                        |
| ----------------------- | ---------------------------------- |
| action                  | Share Action                       |
| app-intent              | App Intent Extension               |
| widget                  | Widget / Live Activity             |
| watch                   | Watch App (with companion iOS App) |
| clip                    | App Clip                           |
| safari                  | Safari Extension                   |
| share                   | Share Extension                    |
| notification-content    | Notification Content Extension     |
| notification-service    | Notification Service Extension     |
| intent                  | Siri Intent Extension              |
| intent-ui               | Siri Intent UI Extension           |
| spotlight               | Spotlight Index Extension          |
| bg-download             | Background Download Extension      |
| quicklook-thumbnail     | Quick Look Thumbnail Extension     |
| location-push           | Location Push Service Extension    |
| credentials-provider    | Credentials Provider Extension     |
| account-auth            | Account Authentication Extension   |
| device-activity-monitor | Device Activity Monitor Extension  |

<!-- | imessage             | iMessage Extension               | -->

## Code Signing

The codesigning is theoretically handled entirely by [EAS Build](https://docs.expo.dev/build/introduction/). This plugin will add the requisite entitlements for target signing to work. I've only tested this end-to-end with my Pillar Valley Widget.

You can also manually sign all sub-targets if you want, I'll light a candle for you.

> I haven't gotten App Clip codesigning to be fully automated yet. PRs welcome.

## Building Widgets

I've written a blog post about building widgets with this plugin: [Expo x Apple Widgets](https://evanbacon.dev/blog/apple-home-screen-widgets).

If you experience issues building widgets, it might be because React Native is shipped uncompiled which makes the build complexity much higher. This often leads to issues with the Swift compiler and SwiftUI previews.

Some workarounds:

- Clear the SwiftUI previews cache: `xcrun simctl --set previews delete all`
- Prebuild without React Native: `npx expo prebuild --template node_modules/@bacons/apple-targets/prebuild-blank.tgz --clean`
- If the widget doesn't show on the home screen when building the app, use iOS 18. You can long press the app icon and select the widget display options to transform the app icon into the widget.

## Sharing data between targets

To share values between the app and the target, you must use App Groups and NSUserDefaults. I've added a native module to make the React Native API a bit easier.

### Configuring App Groups

Start by defining an App Group, a good default is `group.<bundle identifier>`. App Groups can be used across apps so you may want something more generic or less generic if you plan on having multiple extensions.

First, define your main App Group entitlement in your `app.json`:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": ["group.bacon.data"]
      }
    },
    "plugins": ["@bacons/apple-targets"]
  }
}
```

Second, define the same App Group in your target's `expo-target.config.js`:

```js
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  entitlements: {
    // Use the same app groups:
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
```

Now you can prebuild to generate the entitlements. You may need to create an EAS Build or open Xcode to sync the entitlements.

### Setting shared data

To define shared data, we'll use a native module (`ExtensionStorage`) that interacts with `NSUserDefaults`.

Somewhere in your Expo app, you can set a value:

```js
import { ExtensionStorage } from "@bacons/apple-targets";

// Create a storage object with the App Group.
const storage = new ExtensionStorage(
  // Your app group identifier. Should match the values in the app.json and expo-target.config.json.
  "group.bacon.data"
);

// Then you can set data:
storage.set("myKey", "myValue");

// Finally, you can reload the widget:
ExtensionStorage.reloadWidget();
```

`ExtensionStorage` has the following API:

- `set(key: string, value: string | number | Record<string, string | number> | Array<Record<string, string | number>> | undefined): void` - Sets a value in the shared storage for a given key. Setting `undefined` will remove the key.
- `ExtensionStorage.reloadWidget(name?: string): void` - A static method for reloading the widget. Behind the scenes, this calls `WidgetCenter.shared.reloadAllTimelines()`. If given a name, it will reload a specific widget using `WidgetCenter.shared.reloadTimelines(ofKind: timeline)`.

### Accessing shared data

Assuming this is done using Swift code, you'll access data using `NSUserDefaults` directly. Here's an example of how you might access the data in a widget:

```swift
let defaults = UserDefaults(suiteName:
  // Use the App Group from earlier.
  "group.bacon.data"
)
// Access the value you set:
let index = defaults?.string(forKey: "myKey")
```

### More data updates

For more advanced uses, I recommend the following resources:

- Updating widgets when the app is in the background: [Keeping A Widget Up-to-Date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date).

## Xcode parsing

This plugin makes use of my proprietary Xcode parsing library, [`@bacons/xcode`](https://github.com/evanbacon/xcode). It's mostly typed, very untested, and possibly full of bugs––however, it's still 10x nicer than the alternative.

## Control widgets

![Simulator Screenshot - iPhone 16 - 2025-01-26 at 15 57 44](https://github.com/user-attachments/assets/c989a3bb-112d-4026-a718-49de4cdb2f3e)

[Control widgets](https://developer.apple.com/documentation/swiftui/controlwidget) are a type of widget that appears in the control center, Siri suggestions, the lock screen, and Shortcuts.

Generally, you'll want to add control widgets to a `widget` target, but they can be added to any target really.

You can add multiple intents, they should be in the `[target]/_shared/*.swift` folder so they can be added to the main target as well as the widget target, this is required to make them work correctly.

The following is an example of a control widget that launches a universal link for my app.

```swift
// targets/widget/_shared/intents.swift

import AppIntents
import SwiftUI
import WidgetKit

// TODO: These must be added to the WidgetBundle manually. They need to be linked outside of the _shared folder.
// @main
// struct exportWidgets: WidgetBundle {
//     var body: some Widget {
//         widgetControl0()
//         widgetControl1()
//     }
// }

@available(iOS 18.0, *)
struct widgetControl0: ControlWidget {
    // Unique ID for the control.
    static let kind: String = "com.bacon.clipdemo.0"
    var body: some ControlWidgetConfiguration {
      StaticControlConfiguration(kind: Self.kind) {
        ControlWidgetButton(action: OpenAppIntent0()) {
          // You can also use a custom image but it must be an SF Symbol.
          Label("App Settings", systemImage: "star")
        }
      }
      // This is the configuration for the widget.
      .displayName("Launch Settings")
      .description("A control that launches the app settings.")
    }
}

// This must be in both targets when `openAppWhenRun = true`. We can do that by adding it to the _shared folder.
// https://developer.apple.com/forums/thread/763851
@available(iOS 18.0, *)
struct OpenAppIntent0: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Launch Settings"
    static let description = IntentDescription(stringLiteral: "A control that launches the app settings.")
    static let isDiscoverable = true
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        // Here's the URL we want to launch. It can be any URL but it should be a universal link for your app.
        return .result(opensIntent: OpenURLIntent(URL(string: "https://pillarvalley.expo.app/settings")!))
    }
}
```

You should copy the intents into your main `WidgetBundle` struct.

Custom images can be used but they must be SF Symbols, you can use a tool like [Create Custom Symbols](https://github.com/jaywcjlove/create-custom-symbols) to do this. Then simply add to the Assets.xcassets folder and reference it in the `Label`.

You can do a lot of things with Control Widgets like launching a custom UI instead of opening the app. This plugin should allow for most of these things to work.

## App Clips

![IMG_6BC9D9534F1D-1](https://github.com/user-attachments/assets/f9847f6f-4f0a-44f9-932c-3f8e9703c133)

App Clips leverage the true power of Expo Router, enabling you to link a website and native app to just instantly open the native app on iOS. They're pretty hard to get working though.

Here are a few notes from my experience building https://pillarvalley.expo.app (open on iOS to test).

Build the app first, then the website. You can always instantly update the website if it's wrong. This includes the AASA, and metadata.

You may need [this RN patch](https://github.com/facebook/react-native/pull/47000) to get your project working, otherwise it'll crash when launched from Test Flight. Alternatively, you can add App Clip experiences in App Store Connect and it'll launch as expected.

After running prebuild, open the project in Xcode and navigate to the signing tab for each target, this'll ensure the first version of codesigning is absolutely correct. We'll need to adjust EAS Build to ensure it can do this too.

Ensure your App Clip does not have `expo-updates` installed, otherwise it'll fail to build with some cryptic error about React missing in the AppDelegate.

Ensure all the build numbers are the same across the `CURRENT_PROJECT_VERSION` and `CFBundleVersion` (Info.plist) otherwise the app will fail to build.

Ensure you add a `public/.well-known/apple-app-site-association` file to your website and deploy it to the web (`eas deploy --prod`). Here's [an example](https://github.com/EvanBacon/pillar-valley/blob/d5ab82ae04f519310acf4b31aad8d9e22eb3747d/public/.well-known/apple-app-site-association#L27-L29).

The value will be `<Apple Team ID>.<App Clip Bundle ID>`:

```
{
  "appclips": {
    "apps": ["QQ57RJ5UTD.com.evanbacon.pillarvalley.clip"]
  }
}
```

Add the website URL to your App Clip entitlements (not the main entitlements). Here's an example with `https://pillarvalley.expo.app`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>appclips:pillarvalley.expo.app</string>
</array>
```

If this isn't done, then your App Clip will only be able to be launched from the default App Store URL: `https://appclip.apple.com/id?p=com.evanbacon.pillarvalley.clip` (where your App Clip bundle ID will be the ID in the URL).

You should handle redirection from this default URL too with a [`app/+native-intent.ts`](https://docs.expo.dev/router/advanced/native-intent/) file:

```ts
export function redirectSystemPath({ path }: { path: string }): string {
  try {
    // Handle App Clip default page redirection.
    // If path matches https://appclip.apple.com/id?p=com.evanbacon.pillarvalley.clip (with any query parameters), then redirect to `/` path.
    const url = new URL(path);
    if (url.hostname === "appclip.apple.com") {
      // Redirect to the root path and make the original URL available as a query parameter (optional).
      return "/?ref=" + encodeURIComponent(path);
    }
    return path;
  } catch {
    return path;
  }
}
```

You should use `expo-linking` to get URLs related to the App Clip as the upstream React Native Linking has some issues handling App Clips.

When you publish an App Clip, the binary will take about 5 minutes to show up in the App Store (after it's approved) but the App Clip will take more like 25 minutes to show up in your website.

You also need to add some meta tags to your website. These need to run fast so I recommend putting them in your `app/+html.tsx` file:

```js
<meta
  name="apple-itunes-app"
  content={
    "app-id=1336398804, app-clip-bundle-id=com.evanbacon.pillarvalley.clip, app-clip-display=card"
  }
/>
```

You should also add the `og:image` property using `expo-router/head`. [Learn more](https://developer.apple.com/documentation/appclip/supporting-invocations-from-your-website-and-the-messages-app). It seems like an absolute path to a png image that is `1200×630` in dimensions ([based on this](https://developer.apple.com/library/archive/technotes/tn2444/_index.html)).

```js
<Head>
  {/* Required for app clips: */}
  {/* https://developer.apple.com/documentation/appclip/supporting-invocations-from-your-website-and-the-messages-app */}
  <meta property="og:image" content="https://pillarvalley.expo.app/og.png" />
</Head>
```

You also need a `1800x1200` image for the App Store Connect image preview, so make both of these images around the same time.

Launch App Clips from Test Flight to test deep linking. It doesn't seem like there's any reasonable way to test launching from your website in development. I got this to work once by setting up a local experience in my app's "Settings > Developer" screen, then installing the app, opening the website, deleting the app, then installing the App Clip without the app. You'll mostly need to go with God on this one.

You can generate codes using the CLI tool [download here](https://developer.apple.com/download/all/?q=%22app%20clip%22).
