# Expo Swift Package Manager Plugin Specification

## Overview

The `@bacons/spm` plugin brings npm-style dependency management to Swift Package Manager (SPM) in Expo projects. This specification defines a familiar, progressive API that scales from simple package additions to complex multi-platform configurations.

## Table of Contents

- [Motivation](#motivation)
- [Design Principles](#design-principles)
- [Configuration API](#configuration-api)
- [NPM Inspiration](#npm-inspiration)
- [Implementation Details](#implementation-details)
- [Swift Package Manager Mapping](#swift-package-manager-mapping)
- [Migration Guide](#migration-guide)
- [Unsupported Features](#unsupported-features)
- [Examples](#examples)

## Motivation

Swift Package Manager requires manual Xcode project manipulation or complex native configurations. This plugin bridges that gap by:

1. **Leveraging familiar npm patterns** - Developers already know how to manage dependencies
2. **Automating Xcode integration** - No manual project file editing
3. **Supporting Expo's managed workflow** - Works with EAS Build and prebuild
4. **Enabling dynamic configuration** - Environment-aware and conditional dependencies

## Design Principles

### 1. Progressive Disclosure

```javascript
// Simple: Just a version string
"firebase": "^10.0.0"

// Advanced: Object with full configuration
"firebase": {
  "version": "^10.0.0",
  "products": ["Analytics", "Crashlytics"],
  "platforms": { "ios": "14.0" }
}
```

### 2. NPM-First Conventions

- Version syntax matches npm (`^`, `~`, ranges, tags)
- Familiar dependency types (dependencies, devDependencies, optionalDependencies)

### 3. Zero Configuration

- Auto-resolves common packages from a registry
- Infers products when unambiguous
- Handles capabilities and build settings automatically

## Configuration API

### Basic Structure

Configuration lives in `app.json` or `app.config.js` under the plugin config:

```json
{
  "plugins": [
    [
      "@bacons/spm",
      {
        "dependencies": {
          "package-identifier": "version-string-or-config"
        },
        "devDependencies": {},
        "optionalDependencies": {},
        "overrides": {},
        "aliases": {},
        "config": {}
      }
    ]
  ]
}
```

### Version Strings

| Syntax           | Example          | Description                            |
| ---------------- | ---------------- | -------------------------------------- |
| `^1.2.3`         | `^10.0.0`        | Compatible versions (>=10.0.0 <11.0.0) |
| `~1.2.3`         | `~5.6.1`         | Patch-level changes (>=5.6.1 <5.7.0)   |
| `1.2.3`          | `2.1.0`          | Exact version                          |
| `>=1.0.0 <2.0.0` |                  | Version range                          |
| `latest`         |                  | Latest release                         |
| `next`           |                  | Pre-release version                    |
| `branch-name`    | `develop`        | Git branch                             |
| `commit:hash`    | `commit:a1b2c3d` | Specific commit                        |
| `file:path`      | `file:../local`  | Local package                          |
| `workspace:*`    |                  | Monorepo workspace                     |

### Package Configuration Object

```typescript
{
  // Required
  "version": "^1.0.0",

  // Location
  "url": "https://github.com/owner/repo",
  "path": "./local-package",

  // Products
  "products": ["ProductA", "ProductB"],
  "binary": true,  // Use xcframework if available

  // Platforms
  "platforms": {
    "ios": "14.0",
    "tvos": "14.0",
    "catalyst": "14.0",
    "visionos": "1.0"
  },

  // Build Configuration
  "xcconfig": {
    "OTHER_SWIFT_FLAGS": "-D DEBUG",
    "ENABLE_BITCODE": "NO"
  },
  "capabilities": ["push-notifications", "keychain-sharing"],
  "resources": ["Resources/*.bundle"],

  // Conditions
  "condition": "${ENABLE_ANALYTICS}",
  "optional": true,

  // Authentication
  "auth": "${GITHUB_TOKEN}",
  "ssh": true,

  // Hooks
  "prebuild": "./scripts/prepare.sh",
  "postinstall": "./scripts/setup.sh",

  // Development
  "watch": true,
  "link": true
}
```

### Global Configuration

```json
{
  "config": {
    "platforms": {
      "ios": "14.0"
    },
    "swift": "5.9",
    "saveExact": false,
    "savePrefix": "^",
    "parallelDownloads": true,
    "cacheDirectory": "~/.bacons-spm-cache",
    "registry": "https://swiftpackageindex.com"
  }
}
```

## NPM Inspiration

### Concepts Borrowed from NPM

| NPM Feature            | Our Implementation     | Purpose                   |
| ---------------------- | ---------------------- | ------------------------- |
| `dependencies`         | `dependencies`         | Production packages       |
| `devDependencies`      | `devDependencies`      | Build-time only packages  |
| `optionalDependencies` | `optionalDependencies` | Non-critical packages     |
| `overrides`            | `overrides`            | Force transitive versions |
| `workspaces`           | `workspace:*` protocol | Monorepo support          |
| `package-lock.json`    | `Package.resolved`     | Lock file                 |
| `.npmrc`               | `config` section       | Configuration             |
| `^`, `~` versions      | Same syntax            | Familiar versioning       |
| `file:` protocol       | `file:` protocol       | Local packages            |
| Registry concept       | Swift registry         | Package discovery         |

### Key Differences from NPM

1. **Products vs Packages** - Swift packages can contain multiple products (libraries)
2. **Platform Requirements** - iOS/tvOS/watchOS minimum versions
3. **Xcode Integration** - Build settings and capabilities
4. **Binary Distribution** - XCFramework support

## Implementation Details

### Resolution Algorithm

```javascript
// 1. Parse version string
"^10.0.0" → { kind: "upToNextMajor", from: "10.0.0" }
"~5.6.0" → { kind: "upToNextMinor", from: "5.6.0" }
"develop" → { kind: "branch", name: "develop" }

// 2. Resolve package location
"firebase" → "https://github.com/firebase/firebase-ios-sdk"
"@company/sdk" → "https://github.com/company/sdk"
"./local" → { path: resolve("./local") }

// 3. Fetch package manifest
// Parse Package.swift to discover products

// 4. Generate Xcode references
// Add to project.pbxproj with proper build phases
```

### Prebuild Integration

```javascript
// During expo prebuild
withXcodeProject((config, { project }) => {
  // 1. Read swift-packages configuration
  const packages = readSwiftPackagesConfig();

  // 2. Add package references
  packages.forEach((pkg) => {
    project.addSwiftPackage({
      repositoryURL: pkg.url,
      requirement: parseVersionRequirement(pkg.version),
      products: pkg.products,
    });
  });

  // 3. Configure build settings
  if (pkg.xcconfig) {
    project.addBuildSettings(pkg.xcconfig);
  }

  // 4. Add capabilities
  if (pkg.capabilities) {
    project.addCapabilities(pkg.capabilities);
  }

  return config;
});
```

## Swift Package Manager Mapping

### Version Requirements

| NPM Version      | SPM Requirement                 | Example        |
| ---------------- | ------------------------------- | -------------- |
| `^1.2.3`         | `.upToNextMajor(from: "1.2.3")` | >=1.2.3 <2.0.0 |
| `~1.2.3`         | `.upToNextMinor(from: "1.2.3")` | >=1.2.3 <1.3.0 |
| `1.2.3`          | `.exact("1.2.3")`               | Exactly 1.2.3  |
| `>=1.0.0 <2.0.0` | `.range("1.0.0"..<"2.0.0")`     | Range          |
| `branch-name`    | `.branch("branch-name")`        | Git branch     |
| `commit:abc123`  | `.revision("abc123")`           | Git commit     |
| `file:../local`  | `.package(path: "../local")`    | Local package  |

### Package.swift Integration

Our configuration generates equivalent Swift Package Manager code:

```javascript
// app.config.js
{
  plugins: [
    ["@bacons/spm", {
      dependencies: {
        "firebase": "^10.0.0"
      }
    }]
  ]
}

// Generates in Package.swift equivalent:
dependencies: [
  .package(
    url: "https://github.com/firebase/firebase-ios-sdk",
    .upToNextMajor(from: "10.0.0")
  )
]
```

### Xcode Project Structure

```
YourApp.xcodeproj/
├── project.pbxproj
│   ├── XCRemoteSwiftPackageReference (firebase)
│   ├── XCSwiftPackageProductDependency (Analytics)
│   └── XCSwiftPackageProductDependency (Crashlytics)
└── project.xcworkspace/
    └── xcshareddata/
        └── swiftpm/
            └── Package.resolved  // Lock file
```

## Migration Guide

### From Manual SPM

**Before (Xcode):**

1. File → Add Package Dependencies
2. Enter repository URL
3. Choose version rules
4. Select products
5. Configure build settings manually

**After (@bacons/spm):**

```javascript
{
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          "https://github.com/alamofire/alamofire": "^5.6.0",
        },
      },
    ],
  ];
}
```

### From CocoaPods

**Before (Podfile):**

```ruby
pod 'Firebase/Analytics', '~> 10.0.0'
pod 'Firebase/Crashlytics', '~> 10.0.0'
pod 'Alamofire', '~> 5.6'
```

**After (app.config.js):**

```javascript
{
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          firebase: {
            version: "^10.0.0",
            products: ["Analytics", "Crashlytics"],
          },
          "https://github.com/Alamofire/Alamofire": "~5.6.0",
        },
      },
    ],
  ];
}
```

### From Carthage

**Before (Cartfile):**

```
github "ReactiveX/RxSwift" ~> 6.5
github "realm/realm-swift" == 10.42.0
```

**After (app.config.js):**

```javascript
{
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          "https://github.com/ReactiveX/RxSwift": "~6.5.0",
          "https://github.com/realm/realm-swift": "10.42.0",
        },
      },
    ],
  ];
}
```

## Unsupported Features

While `@bacons/spm` covers most common use cases, some Swift Package Manager features require additional configuration or custom plugins:

### 1. Complex Build Plugins

**SPM Feature:** Swift packages can define build plugins that run during compilation.

**Workaround:** Create a custom config plugin that runs after `@bacons/spm`:

```javascript
// plugins/with-swift-build-plugins.js
const { withXcodeProject } = require("@expo/config-plugins");

module.exports = function withSwiftBuildPlugins(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;

    // Add custom build phase for Swift package plugins
    project.addBuildPhase({
      type: "PBXShellScriptBuildPhase",
      name: "Run Swift Package Plugin",
      shellScript:
        "swift package plugin --allow-writing-to-directory $BUILT_PRODUCTS_DIR generate-code",
    });

    return config;
  });
};

// app.config.js
{
  plugins: [
    [
      "@bacons/spm",
      {
        /* ... */
      },
    ],
    "./plugins/with-swift-build-plugins",
  ];
}
```

### 2. Custom Module Maps

**SPM Feature:** Packages can provide custom module maps for C/Objective-C interop.

**Workaround:** Use a config plugin to add module map paths:

```javascript
// plugins/with-module-maps.js
module.exports = function withModuleMaps(config, { moduleMaps }) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;

    moduleMaps.forEach((mapPath) => {
      project.addBuildSetting("SWIFT_INCLUDE_PATHS", mapPath);
    });

    return config;
  });
};

// Usage
{
  plugins: [
    [
      "@bacons/spm",
      {
        /* ... */
      },
    ],
    [
      "./plugins/with-module-maps",
      {
        moduleMaps: ["$(SRCROOT)/CustomModules"],
      },
    ],
  ];
}
```

### 3. Package Access Control

**SPM Feature:** Packages can specify access levels for their APIs.

**Current Limitation:** All imported packages are available project-wide.

**Workaround:** Use a linting config plugin:

```javascript
// plugins/with-package-access-control.js
module.exports = function withPackageAccessControl(config, { rules }) {
  // Add SwiftLint rules to enforce access patterns
  return withSwiftLint(config, {
    rules: {
      restricted_imports: {
        Firebase: ["Analytics/*", "Core/*"],
        InternalSDK: ["MyApp/Features/*"],
      },
    },
  });
};
```

### 4. Conditional Target Dependencies

**SPM Feature:** Different targets can have different dependencies.

**Workaround:** Create multiple config plugins or use environment variables:

```javascript
// app.config.js
export default ({ config }) => ({
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          // Main app dependencies
          firebase: "^10.0.0",

          // Conditional dependencies based on target
          ...(process.env.INCLUDE_TESTS && {
            quick: {
              version: "^7.0.0",
              products: ["Quick", "Nimble"],
              condition: "${INCLUDE_TESTS}",
            },
          }),
        },
      },
    ],
  ],
});
```

### 5. Binary Targets with Checksums

**SPM Feature:** Binary targets can specify checksums for verification.

**Workaround:** Add checksum validation in a config plugin:

```javascript
// plugins/with-binary-validation.js
const crypto = require("crypto");

module.exports = function withBinaryValidation(config, { binaries }) {
  return withDangerousModifier(config, async (config) => {
    for (const binary of binaries) {
      const checksum = await calculateChecksum(binary.path);
      if (checksum !== binary.expectedChecksum) {
        throw new Error(`Checksum mismatch for ${binary.name}`);
      }
    }
    return config;
  });
};
```

### 6. Resources and Asset Catalogs

**SPM Feature:** Packages can bundle resources and asset catalogs.

**Workaround:** Use a config plugin to copy resources:

```javascript
// plugins/with-package-resources.js
module.exports = function withPackageResources(config, { packages }) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;

    packages.forEach((pkg) => {
      if (pkg.resources) {
        project.addResourceFile(pkg.resources, {
          target: project.getMainTarget(),
        });
      }
    });

    return config;
  });
};
```

## Examples

### Simple Firebase Integration

```javascript
// app.config.js
export default {
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          firebase: "^10.0.0",
        },
      },
    ],
  ],
};
```

### Complex Multi-Package Setup

```javascript
// app.config.js
export default ({ config }) => ({
  ...config,
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          // Simple packages
          firebase: "^10.0.0",
          alamofire: "~5.6.0",

          // Configured package
          stripe: {
            version: "^23.0.0",
            products: ["Stripe", "StripePaymentSheet"],
            capabilities: ["apple-pay"],
          },

          // Local package
          "../shared/analytics": {
            version: "file:../shared/analytics",
            watch: true,
          },

          // Conditional package
          mapbox: {
            version: "^10.0.0",
            products: ["MapboxMaps"],
            condition: "${ENABLE_MAPS}",
            xcconfig: {
              MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_TOKEN,
            },
          },
        },

        devDependencies: {
          swiftlint: "^0.50.0",
        },

        config: {
          platforms: { ios: "14.0" },
          savePrefix: "^",
        },
      },
    ],
  ],
});
```

### Monorepo Setup

```javascript
// app.config.js
export default {
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          "@company/shared-ui": "workspace:*",
          "@company/analytics": "workspace:*",
          firebase: "^10.0.0",
        },
        aliases: {
          "@company/*": "../../packages/$1",
        },
      },
    ],
  ],
};
```

### Private Repository

```javascript
// app.config.js
export default {
  plugins: [
    [
      "@bacons/spm",
      {
        dependencies: {
          "internal-sdk": {
            version: "^1.0.0",
            url: "https://github.com/company/private-sdk",
            auth: "${GITHUB_TOKEN}",
            products: ["Core", "UI"],
          },
        },
      },
    ],
  ],
};
```

## Future Considerations

1. **Swift Package Registry** - When Apple releases an official registry, auto-resolution will improve
2. **Type Generation** - Generate TypeScript definitions from Swift interfaces
3. **Hot Reload** - Development builds with Swift package hot reload
4. **Workspace Integration** - Better monorepo support with Yarn/npm workspaces
5. **Binary Caching** - Faster builds with pre-compiled frameworks
6. **CLI Tools** - Add package management commands similar to npm/yarn

## Contributing

This specification is open for feedback. Key areas for contribution:

1. Registry package aliases for common packages
2. Platform-specific configuration patterns
3. Build optimization strategies
4. Security audit implementation

## License

MIT
