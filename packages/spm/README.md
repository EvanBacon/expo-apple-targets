# @bacons/spm

> NPM-style Swift Package Manager dependency management for Expo projects

Bring familiar npm-style dependency management to Swift Package Manager in your Expo iOS projects. No more manual Xcode project manipulation—just declare your dependencies in `app.json` or `app.config.js` and let Expo prebuild handle the rest.

## Features

- ✅ **NPM-style version syntax** - Use `^`, `~`, exact versions, ranges, branches, and commits
- ✅ **Automatic package resolution** - Integration with Swift Package Index
- ✅ **Zero Xcode manipulation** - Works seamlessly with Expo prebuild
- ✅ **Auto-product resolution** - Automatically discovers available products from Package.swift
- ✅ **Local packages** - Support for monorepo and local development
- ✅ **Simple API** - Progressive from simple version strings to advanced configuration

## Installation

```bash
npm install @bacons/spm
# or
yarn add @bacons/spm
```

## Quick Start

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@bacons/spm",
        {
          "dependencies": {
            "firebase": "^10.0.0",
            "alamofire": "~5.6.0"
          }
        }
      ]
    ]
  }
}
```

Then run:

```bash
npx expo prebuild --clean
```

That's it! Your Swift packages are now integrated into your Xcode project.

## Configuration

### Basic Usage (Simple Version Strings)

The simplest way to add dependencies is with version strings:

```javascript
{
  "plugins": [
    [
      "@bacons/spm",
      {
        "dependencies": {
          "firebase": "^10.0.0",           // Caret range (>=10.0.0 <11.0.0)
          "alamofire": "~5.6.0",           // Tilde range (>=5.6.0 <5.7.0)
          "kingfisher": "7.10.0",          // Exact version
          "rxswift": "latest"              // Latest version
        }
      }
    ]
  ]
}
```

### Advanced Usage (Configuration Objects)

For more control, use configuration objects:

```javascript
{
  "plugins": [
    [
      "@bacons/spm",
      {
        "dependencies": {
          // Full configuration
          "firebase": {
            "version": "^10.0.0",
            "products": ["Analytics", "Crashlytics"],
            "platforms": {
              "ios": "14.0"
            }
          },

          // Specific GitHub URL
          "https://github.com/Alamofire/Alamofire": "~5.6.0",

          // Local package
          "../shared-package": {
            "version": "file:../shared-package",
            "products": ["SharedCore"]
          },

          // Branch or commit
          "my-package": {
            "version": "develop",  // or "commit:abc123"
            "url": "https://github.com/user/my-package"
          }
        }
      }
    ]
  ]
}
```

## Version String Syntax

| Syntax           | Example          | Description                            |
| ---------------- | ---------------- | -------------------------------------- |
| `^1.2.3`         | `^10.0.0`        | Compatible versions (>=10.0.0 <11.0.0) |
| `~1.2.3`         | `~5.6.1`         | Patch-level changes (>=5.6.1 <5.7.0)   |
| `1.2.3`          | `2.1.0`          | Exact version                          |
| `>=1.0.0 <2.0.0` |                  | Version range                          |
| `latest`         |                  | Latest release                         |
| `branch-name`    | `develop`        | Git branch                             |
| `commit:hash`    | `commit:a1b2c3d` | Specific commit                        |
| `file:path`      | `file:../local`  | Local package                          |

## Package Configuration

When using a configuration object, you can specify:

```typescript
{
  // Required
  "version": "^1.0.0",           // Version requirement

  // Optional
  "url": "https://github.com/...",  // Repository URL (if not using registry)
  "path": "../local-package",       // Local file path
  "products": ["ProductA"],         // Products to link (auto-resolved if omitted)
  "platforms": {                    // Platform deployment targets
    "ios": "14.0",
    "tvos": "14.0"
  }
}
```

## Examples

### Firebase Integration

```javascript
{
  "dependencies": {
    "firebase": {
      "version": "^10.0.0",
      "products": ["FirebaseAnalytics", "FirebaseCrashlytics", "FirebaseAuth"]
    }
  }
}
```

### Multiple Packages

```javascript
{
  "dependencies": {
    "firebase": "^10.0.0",
    "alamofire": "~5.6.0",
    "kingfisher": "7.10.0",
    "snapkit": "^5.6.0"
  }
}
```

### Local Development Package

```javascript
{
  "dependencies": {
    "my-local-package": {
      "version": "file:../packages/my-local-package",
      "products": ["MyPackage"]
    }
  }
}
```

### Private Repository

```javascript
{
  "dependencies": {
    "internal-sdk": {
      "version": "^1.0.0",
      "url": "https://github.com/company/private-sdk"
      // Note: Authentication is handled by Xcode/Git credentials
    }
  }
}
```

### Development vs Production

```javascript
{
  "dependencies": {
    "firebase": "^10.0.0",
    "alamofire": "~5.6.0"
  },
  "devDependencies": {
    "swiftlint": "^0.50.0"  // Build-time only
  }
}
```

## Package Resolution

The plugin resolves package identifiers in this order:

1. **Full URLs** - If you provide a full `https://` or `git@` URL, it's used as-is
2. **Local aliases** - Common packages like `firebase`, `alamofire` are pre-mapped
3. **Swift Package Index** - Queries swiftpackageindex.com for package metadata
4. **GitHub shorthand** - Converts `owner/repo` to `https://github.com/owner/repo`

### Supported Package Names

These popular packages are recognized automatically:

- `firebase` → Firebase iOS SDK
- `alamofire` → Alamofire networking
- `kingfisher` → Image downloading/caching
- `snapkit` → Auto Layout DSL
- `realm` → Realm database
- `rxswift` → Reactive programming
- `lottie` → Lottie animations
- `swiftlint` → SwiftLint
- And many more...

For packages not in the built-in registry, provide the full GitHub URL.

## Product Resolution

Products (the actual libraries/frameworks you import in Swift) are auto-resolved by fetching the package's `Package.swift` file. If auto-resolution fails, you can specify products manually:

```javascript
{
  "dependencies": {
    "firebase": {
      "version": "^10.0.0",
      "products": ["FirebaseAnalytics", "FirebaseAuth"]  // Manual specification
    }
  }
}
```

## Migration Guides

### From Manual SPM (Xcode)

**Before** (in Xcode):
1. File → Add Package Dependencies
2. Enter repository URL
3. Choose version rules
4. Select products

**After** (with @bacons/spm):
```javascript
{
  "dependencies": {
    "https://github.com/Alamofire/Alamofire": "^5.6.0"
  }
}
```

### From CocoaPods

**Before** (Podfile):
```ruby
pod 'Firebase/Analytics', '~> 10.0.0'
pod 'Firebase/Crashlytics', '~> 10.0.0'
pod 'Alamofire', '~> 5.6'
```

**After** (app.config.js):
```javascript
{
  "dependencies": {
    "firebase": {
      "version": "^10.0.0",
      "products": ["FirebaseAnalytics", "FirebaseCrashlytics"]
    },
    "alamofire": "~5.6.0"
  }
}
```

## Troubleshooting

### Package not found

If a package isn't automatically resolved:
```javascript
{
  "dependencies": {
    // Provide the full URL
    "my-package": {
      "version": "^1.0.0",
      "url": "https://github.com/owner/my-package"
    }
  }
}
```

### Products not linking

If products aren't auto-detected:
```javascript
{
  "dependencies": {
    "my-package": {
      "version": "^1.0.0",
      "products": ["ProductName"]  // Specify manually
    }
  }
}
```

### Build errors after adding packages

1. Clean the build: `npx expo prebuild --clean`
2. Ensure products are correctly specified
3. Check package compatibility with your iOS deployment target

## How It Works

1. **Configuration parsing** - Reads dependencies from `app.json`/`app.config.js`
2. **Package resolution** - Resolves package names to repository URLs
3. **Version parsing** - Converts npm-style versions to SPM requirements
4. **Product discovery** - Fetches Package.swift to find available products
5. **Xcode integration** - Modifies `project.pbxproj` to add package references
6. **Product linking** - Links products to your main app target

All of this happens during `expo prebuild`, so your Xcode project stays in sync with your configuration.

## Limitations (MVP)

This is an MVP release. The following features are not yet implemented:

- ❌ Custom xcconfig settings per package
- ❌ iOS capabilities management
- ❌ Conditional dependencies based on environment
- ❌ Private repository authentication (uses system Git credentials)
- ❌ Binary framework preferences
- ❌ Build hooks (prebuild, postinstall)

These features are planned for future releases. See the [specification](../../spec/spm.md) for the full feature roadmap.

## TypeScript Support

This package is written in TypeScript and includes full type definitions:

```typescript
import { PluginConfig, PackageConfig, ResolvedPackage } from "@bacons/spm";
```

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT

## Related

- [@bacons/apple-targets](../apple-targets) - Create iOS widgets, extensions, and App Clips
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Swift Package Manager](https://www.swift.org/package-manager/)
- [Swift Package Index](https://swiftpackageindex.com/)
