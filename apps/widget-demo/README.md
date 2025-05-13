# Apple Targets Widget Demo

## Contributing

This is iOS only, no Android or web testing is needed. You'll need to change the credentials around in app.json:

```json
{
  "appleTeamId": "QQ57RJ5UTD",
  "bundleIdentifier": "com.bacon.clipdemo",
  "entitlements": {
    "com.apple.security.application-groups": ["group.bacon.data"]
  }
}
```

### Widget

> ~1 minute

First ensure the widget can be developed in Xcode:

```
yarn nprebuild

xed ios
```

Navigate to the widgets/ code and start SwiftUI preview.

### Full App

> ~5 minutes

```
yarn ios:clean
```

App and widget should be built and run on simulator.
