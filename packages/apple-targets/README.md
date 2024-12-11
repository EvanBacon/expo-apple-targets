# Apple Targets plugin

> [!WARNING]
> This is highly experimental and not part of any official Expo workflow.

<img width="1061" alt="Screenshot 2023-06-10 at 1 59 26 PM" src="https://github.com/EvanBacon/expo-apple-targets/assets/9664363/4cd8399d-53aa-401a-9caa-3a1432a0640c">

An experimental Expo Config Plugin that generates native Apple Targets like Widgets or App Clips, and links them outside the `/ios` directory. You can open Xcode and develop the targets inside the virtual `expo:targets` folder and the changes will be saved outside of the `ios` directory. This pattern enables building things that fall outside of the scope of React Native while still obtaining all the benefits of Continuous Native Generation.

## 🚀 How to use

> This plugin requires at least CocoaPods 1.16.2, Xcode 16, and Expo SDK +52.

Run the following command in your Expo project:

```
npx create-target
```

Select a target to generate, I recommend starting with a `widget`.

This will generate the required widget files in the `targets` directory.

Ensure the `ios.appleTeamId` property is set in your `app.json`, then run `npx expo prebuild -p ios --clean` to generate the Xcode project.

You can now open Xcode and develop the widget inside the `expo:targets` folder. When you're ready to build, run:

### Manual usage

- Add targets to `targets/` directory with an `expo-target.config.json` file.
- If you don't have an `Info.plist`, it'll be generated on `npx expo prebuild`. This may be changed in the future so if you have an `Info.plist` it'll be used, otherwise, it'll be generated.
- Any files in a top-level `target/*/assets` directory will be linked as resources of the target. This was added to support Safari Extensions.
- A single top-level `*.entitlements` file will be linked as the entitlements of the target. This is not currently used in EAS Capability signing, but may be in the future.
- All Swift files will be linked as build sources of the target. There is currently no support for storyboard or `.xib` files because I can't be bothered.
- All `*.xcassets` files will be linked as resources, and accessible in the targets. If you add files outside of Xcode, you'll need to re-run `npx expo prebuild` to link them.
- In Expo SDK +52, set the `ios.appleTeamId`, for SDK 51 and below, set the `appleTeamId` prop in the Config Plugin in `app.config.js`:

```json
{
  "plugins": [
    [
      "@bacons/apple-targets",
      {
        "appleTeamId": "XXXXXXXXXX"
      }
    ]
  ]
}
```

## `expo-target.config.js`

This file can have the following properties:

```js
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
    // Frameworks without the extension, these will be added to the target.
    "SwiftUI",
  ],
  entitlements: {
    // Serialized entitlements. Useful for configuring with environment variables.
  },
  // Generates xcassets for the target.
  images: {
    thing: "../assets/thing.png",
  },

  // The iOS version fot the target.
  deploymentTarget: "13.4",

  // Optional bundle identifier for the target. Will default to a sanitized version of the root project bundle id + target name.
  // If the specified bundle identifier is prefixed with a dot (.), the bundle identifier will be appended to the main app's bundle identifier.
  bundleIdentifier: ".mywidget",
};
```

You can also use `.js` with the typedoc for autocomplete:

```js
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "watch",
  colors: {
    $accent: "steelblue",
  },
  deploymentTarget: "9.4",
};
```

Finally, you can return a function that accepts the Expo Config and returns a target function for syncing app groups:

```js
/** @type {import('@bacons/apple-targets').ConfigFunction} */
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

## Examples

### `widget`

> I wrote a blog about this one and used it in production. Learn more: [Expo x Apple Widgets](https://evanbacon.dev/blog/apple-home-screen-widgets).

```js
/** @type {import('@bacons/apple-targets').Config} */
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

These show up in the share sheet. The icon should be transparent as it will be masked by the system.

```js
/** @type {import('@bacons/apple-targets').Config} */
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
/** @type {import('@bacons/apple-targets').Config} */
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

## Xcode parsing

This plugin makes use of my proprietary Xcode parsing library, [`@bacons/xcode`](https://github.com/evanbacon/xcode). It's mostly typed, very untested, and possibly full of bugs––however, it's still 10x nicer than the alternative.

## Building Widgets

I've written a blog post about building widgets with this plugin: [Expo x Apple Widgets](https://evanbacon.dev/blog/apple-home-screen-widgets).

If you experience issues building widgets, it might be because React Native is shipped uncompiled which makes the build complexity much higher. This often leads to issues with the Swift compiler and SwiftUI previews.

Some workarounds:

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
/** @type {import('@bacons/apple-targets').ConfigFunction} */
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

## Using React Native in Targets

I'm not sure, that's not the purpose of this plugin. I built this so I could easily build iOS widgets and other minor targets with SwiftUI. I imagine it would be straightforward to use React Native in share, notification, iMessage, Safari, and photo editing extensions, you can build that on top of this plugin if you want. Look at the App Clip example for a starting point.
