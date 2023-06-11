# Apple Targets plugin

<img width="1061" alt="Screenshot 2023-06-10 at 1 59 26 PM" src="https://github.com/EvanBacon/expo-apple-targets/assets/9664363/4cd8399d-53aa-401a-9caa-3a1432a0640c">

An experimental Expo Config Plugin which generates native Apple Targets like Widgets or App Clips, and links them outside the ios directory. You can open Xcode and develop the targets inside the virtual `expo:targets` folder, and the changes will be saved outside of the `ios` directory. This pattern enables building things that fall outside of the scope of React Native while still obtaining all the benefits of Continuous Native Generation.

> This is highly experimental and not part of any official Expo workflow.

## 🚀 How to use

- Add targets to `targets/` directory with an `expo-target.config.json` file.
- Currently, if you don't have an `Info.plist`, it'll be generated on `npx expo prebuild`. This may be changed in the future so if you have an `Info.plist` it'll be used, otherwise it'll be generated.
- Any files in a top-level `target/*/assets` directory will be linked as resources of the target. This was added to support Safari Extensions.
- A single top-level `*.entitlements` file will be linked as the entitlements of the target. This is not currently used in EAS Capability signing, but may be in the future.
- All top-level swift files will be linked as build sources of the target. There is currently no support for storyboard or xib files because I can't be bothered.
- All top-level `*.xcassets` will be linked as resources, and accessible in the targets. If you add files outside of Xcode, you'll need to re-run `npx expo prebuild` to link them.
- Code-signing requires the teamId be provided to the plugin in `app.config.js`.

## Using React Native in Targets

I'm not sure, that's not the purpose of this plugin. I built this so I could easily build iOS widgets and other minor targets with SwiftUI. I imagine it would be straightforward to use React Native in share, notification, iMessage, Safari, and photo editing extensions, you can build that on top of this plugin if you want.

## `expo-target.config.json`

This file can have the following properties:

```json
{
  "type": "widget",
  "accentColor": { "color": "red", "darkColor": "blue" },
  // or "accentColor": "red",
  "icon": "../assets/icon.png",
  // Can also be a URL
  "frameworks": [
    // Frameworks without the extension, these will be added to the target.
    "SwiftUI"
  ]
}
```

You can also use `.js` with the typedoc for autocomplete:

```js
/** @type {import('../../target-plugin/config').Config} */
module.exports = {
  type: "watch",
  accentColor: "steelblue",
  deploymentTarget: "9.4",
};
```

### Supported types

Ideally, this would be generated automatically based on a fully qualified Xcode project, but for now it's a manual process. The currently supported types are based on static analysis of the most commonly used targets in the iOS App Store.

| Type                 | Description                        |
| -------------------- | ---------------------------------- |
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
| matter               | Matter Intent Extension            |
| bg-download          | Background Download Extension      |
| quicklook-thumbnail  | Quick Look Thumbnail Extension     |
| location-push        | Location Push Service Extension    |
| credentials-provider | Credentials Provider Extension     |
| account-auth         | Account Authentication Extension   |

<!-- | imessage             | iMessage Extension               | -->

## Xcode parsing

This plugin makes use of my proprietary Xcode parsing library, [`@bacons/xcode`](https://github.com/evanbacon/xcparse). It's mostly typed, very untested, and possibly full of bugs––however, it's still 10x nicer than the alternative.
