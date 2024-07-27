# Apple Targets plugin

> [!WARNING]
> This is highly experimental and not part of any official Expo workflow.

<img width="1061" alt="Screenshot 2023-06-10 at 1 59 26 PM" src="https://github.com/EvanBacon/expo-apple-targets/assets/9664363/4cd8399d-53aa-401a-9caa-3a1432a0640c">

An experimental Expo Config Plugin that generates native Apple Targets like Widgets or App Clips, and links them outside the `/ios` directory. You can open Xcode and develop the targets inside the virtual `expo:targets` folder and the changes will be saved outside of the `ios` directory. This pattern enables building things that fall outside of the scope of React Native while still obtaining all the benefits of Continuous Native Generation.

## 🚀 How to use

- Add targets to `targets/` directory with an `expo-target.config.json` file.
- Currently, if you don't have an `Info.plist`, it'll be generated on `npx expo prebuild`. This may be changed in the future so if you have an `Info.plist` it'll be used, otherwise, it'll be generated.
- Any files in a top-level `target/*/assets` directory will be linked as resources of the target. This was added to support Safari Extensions.
- A single top-level `*.entitlements` file will be linked as the entitlements of the target. This is not currently used in EAS Capability signing, but may be in the future.
- All top-level swift files will be linked as build sources of the target. There is currently no support for storyboard or `.xib` files because I can't be bothered.
- All top-level `*.xcassets` will be linked as resources, and accessible in the targets. If you add files outside of Xcode, you'll need to re-run `npx expo prebuild` to link them.
- Code-signing requires the teamId be provided to the plugin in `app.config.js`.

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

You can change the root directory from `./targets` to something else with `root: "./src/targets"`. Avoid doing this.

## Using React Native in Targets

I'm not sure, that's not the purpose of this plugin. I built this so I could easily build iOS widgets and other minor targets with SwiftUI. I imagine it would be straightforward to use React Native in share, notification, iMessage, Safari, and photo editing extensions, you can build that on top of this plugin if you want.

## `expo-target.config.json`

This file can have the following properties:

```json
{
  "type": "widget",

  // Name of the target/product. Defaults to the directory name.
  "name": "My Widget",

  // Generates colorset files for the target.
  "colors": {
    // or "$accent": "red",
    "$accent": { "color": "red", "darkColor": "blue" }
  },
  "icon": "../assets/icon.png",
  // Can also be a URL
  "frameworks": [
    // Frameworks without the extension, these will be added to the target.
    "SwiftUI"
  ],
  "entitlements": {
    // Serialized entitlements. Useful for configuring with environment variables.
  },
  // Generates xcassets for the target.
  "images": {
    "thing": "../assets/thing.png"
  },

  // The iOS version fot the target.
  "deploymentTarget": "13.4",

  // Optional bundle identifier for the target. Will default to a sanitized version of the root project bundle id + target name.
  // If the specified bundle identifier is prefixed with a dot (.), the bundle identifier will be appended to the main app's bundle identifier.
  "bundleIdentifier": ".mywidget"
}
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

## Colors

There are certain values that are shared across targets. We use a predefined convention to map these values across targets.

| Name                | Build Setting                                        | Purpose                                                                                                      |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `$accent`           | `ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME`     | Sets the global accent color, in widgets this is used for the tint color of buttons when editing the widget. |
| `$widgetBackground` | `ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME` | Sets the background color of the widget.                                                                     |

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

| Type                 | Description                        |
| -------------------- | ---------------------------------- |
| action               | Share Action                       |
| widget               | Widget / Live Activity             |
| watch                | Watch App (with companion iOS App) |
| clip                 | App Clip                           |
| safari               | Safari Extension                   |
| share                | Share Extension                    |
| notification-content | Notification Content Extension     |
| notification-service | Notification Service Extension     |
| intent               | Siri Intent Extension              |
| intent-ui            | Siri Intent UI Extension           |
| spotlight            | Spotlight Index Extension          |
| bg-download          | Background Download Extension      |
| quicklook-thumbnail  | Quick Look Thumbnail Extension     |
| location-push        | Location Push Service Extension    |
| credentials-provider | Credentials Provider Extension     |
| account-auth         | Account Authentication Extension   |

<!-- | imessage             | iMessage Extension               | -->

## Code Signing

The codesigning is theoretically handled entirely by [EAS Build](https://docs.expo.dev/build/introduction/). This plugin will add the requisite entitlements for target signing to work. I've only tested this end-to-end with my Pillar Valley Widget.

You can also manually sign all sub-targets if you want, I'll light a candle for you.

## Xcode parsing

This plugin makes use of my proprietary Xcode parsing library, [`@bacons/xcode`](https://github.com/evanbacon/xcode). It's mostly typed, very untested, and possibly full of bugs––however, it's still 10x nicer than the alternative.
