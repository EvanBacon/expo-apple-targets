# @bacons/spm

An Expo Config Plugin that adds NPM-style Swift Package Manager (SPM) dependency management to your Expo projects. Declare Swift packages using familiar NPM version syntax and have them automatically added to your Xcode project during prebuild.

## Installation

```sh
npx expo install @bacons/spm
```

## Usage

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      ["@bacons/spm", {
        "dependencies": {
          "firebase": "^11.0.0",
          "alamofire": "~5.9.0",
          "SnapKit/SnapKit": "^5.7.0"
        }
      }]
    ]
  }
}
```

Then run prebuild:

```sh
npx expo prebuild -p ios --clean
```

## Version Syntax

Use familiar NPM-style version strings:

| Syntax | SPM Equivalent | Description |
|--------|----------------|-------------|
| `^1.2.3` | Up to Next Major | `>=1.2.3 <2.0.0` |
| `~1.2.3` | Up to Next Minor | `>=1.2.3 <1.3.0` |
| `1.2.3` | Exact Version | Exactly `1.2.3` |
| `>=1.0.0 <2.0.0` | Version Range | Explicit range |
| `latest` or `*` | Any | Latest available version |
| `develop` | Branch | Use a branch name |
| `commit:abc123` | Revision | Specific commit hash |
| `file:../local-pkg` | Local | Local package path |
| `../local-pkg` | Local | Local path shorthand |

## Package Resolution

Packages are resolved in the following order:

1. **Full URL** — Use directly: `"https://github.com/SnapKit/SnapKit.git": "^5.0.0"`
2. **GitHub shorthand** — `owner/repo` format: `"SnapKit/SnapKit": "^5.0.0"`
3. **Built-in alias** — Common packages have short names (see below)
4. **Custom alias** — Define your own in the `aliases` config

### Built-in Aliases

These popular packages can be referenced by short name:

| Alias | Package |
|-------|---------|
| `firebase` | firebase/firebase-ios-sdk |
| `alamofire` | Alamofire/Alamofire |
| `snapkit` | SnapKit/SnapKit |
| `kingfisher` | onevcat/Kingfisher |
| `lottie` | airbnb/lottie-ios |
| `realm` | realm/realm-swift |
| `rxswift` | ReactiveX/RxSwift |
| `moya` | Moya/Moya |
| `sdwebimage` | SDWebImage/SDWebImage |
| `nuke` | kean/Nuke |
| `grdb` | groue/GRDB.swift |
| `swiftyjson` | SwiftyJSON/SwiftyJSON |
| `the-composable-architecture` | pointfreeco/swift-composable-architecture |
| `swift-collections` | apple/swift-collections |
| `swift-algorithms` | apple/swift-algorithms |
| `swift-crypto` | apple/swift-crypto |
| `swift-log` | apple/swift-log |
| `swift-protobuf` | apple/swift-protobuf |
| `swift-argument-parser` | apple/swift-argument-parser |
| `swift-numerics` | apple/swift-numerics |

## Configuration

### Full Package Config

For more control, use an object instead of a version string:

```json
{
  "plugins": [
    ["@bacons/spm", {
      "dependencies": {
        "firebase": {
          "version": "^11.0.0",
          "products": ["FirebaseAuth", "FirebaseFirestore"],
          "targets": ["MyApp", "MyAppWidget"]
        },
        "my-local-package": {
          "path": "../packages/my-swift-package",
          "products": ["MyLibrary"]
        }
      }
    }]
  ]
}
```

### Package Config Options

| Option | Type | Description |
|--------|------|-------------|
| `version` | `string` | NPM-style version string |
| `url` | `string` | Full git URL (overrides resolution) |
| `path` | `string` | Local package path |
| `products` | `string[]` | Specific products to link (defaults to package name) |
| `targets` | `string[]` | Which Xcode targets to link to (defaults to main app) |
| `platforms` | `object` | Minimum platform versions |
| `optional` | `boolean` | Don't fail if package unavailable |

### Dependency Types

```json
{
  "plugins": [
    ["@bacons/spm", {
      "dependencies": {
        "alamofire": "^5.9.0"
      },
      "devDependencies": {
        "swift-snapshot-testing": "^1.15.0"
      },
      "optionalDependencies": {
        "some-optional-package": "^1.0.0"
      }
    }]
  ]
}
```

- **dependencies** — Always included
- **devDependencies** — Included in debug builds (TODO)
- **optionalDependencies** — Warn instead of fail if unavailable

### Custom Aliases

Define shortcuts for frequently used packages:

```json
{
  "plugins": [
    ["@bacons/spm", {
      "aliases": {
        "my-utils": "https://github.com/myorg/swift-utils.git"
      },
      "dependencies": {
        "my-utils": "^1.0.0"
      }
    }]
  ]
}
```

### Global Config

```json
{
  "plugins": [
    ["@bacons/spm", {
      "config": {
        "platforms": {
          "ios": "15.0",
          "watchos": "8.0"
        },
        "swift": "5.9",
        "saveExact": false,
        "savePrefix": "^"
      },
      "dependencies": {}
    }]
  ]
}
```

## Examples

### Firebase with Specific Products

```json
{
  "dependencies": {
    "firebase": {
      "version": "^11.0.0",
      "products": ["FirebaseAuth", "FirebaseFirestore", "FirebaseMessaging"]
    }
  }
}
```

### Local Package Development

Use the path shorthand for local packages — products default to the package name:

```json
{
  "dependencies": {
    "MySwiftLib": "../MySwiftLib"
  }
}
```

Or use the full config for custom products:

```json
{
  "dependencies": {
    "my-swift-lib": {
      "path": "../MySwiftLib",
      "products": ["MySwiftLib", "MySwiftLibCore"]
    }
  }
}
```

### Branch or Commit

```json
{
  "dependencies": {
    "experimental-lib": "main",
    "pinned-lib": "commit:abc123def456"
  }
}
```

### Linking to Multiple Targets

Useful when using with `@bacons/apple-targets`:

```json
{
  "dependencies": {
    "alamofire": {
      "version": "^5.9.0",
      "targets": ["MyApp", "MyWidgetExtension"]
    }
  }
}
```

## Debugging

Enable debug logging:

```sh
DEBUG=spm:* npx expo prebuild -p ios --clean
```

Available debug namespaces:
- `spm:plugin` — Main plugin flow
- `spm:xcode` — Xcode project modifications
- `spm:registry` — Package URL resolution

## How It Works

1. During `expo prebuild`, the plugin reads your SPM configuration
2. Version strings are parsed and converted to SPM-compatible requirements
3. Package URLs are resolved using aliases, GitHub shorthand, or full URLs
4. Swift package references are added to the Xcode project
5. Products are linked to the specified targets (or main app target)

The plugin uses a custom Expo base mod to ensure proper Xcode project serialization.

## Contributing

Contributions are welcome! Please refer to the [contributing guide](https://github.com/expo/expo#contributing).
