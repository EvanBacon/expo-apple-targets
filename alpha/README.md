- `*.xcassets` files are automatically added to the Widget target's PBXResourcesBuildPhase (resources added to this phase are copied into the widget bundle)
- `*.swift` files are automatically added to the Widget target's PBXSourcesBuildPhase (sources added to this phase are compiled into the widget bundle)
- `*.intentdefinition` files are automatically added to the Widget and main App's PBXSourcesBuildPhase.

The following are managed by the Config Plugin:

- `Assets.xcassets/AccentColor.colorset`
- `Assets.xcassets/AppIcon.appiconset`
- `Assets.xcassets/WidgetBackground.colorset`
