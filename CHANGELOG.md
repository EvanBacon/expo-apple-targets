# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions workflows to publish `@bacons/apple-targets` and `create-target` to npm (`publish.yml` beta on main / manual dispatch; `publish-stable.yml` manual dispatch on main only). Both require the `NPM_TOKEN` repository secret before the first publish.
- Keep a Changelog file (requested in #128).
- README section listing which target types each macOS e2e shard compiles, and what CI cannot sign or run on device.

### Changed

- Reconfirmed draft #210 on 2026-10-01. CI on `73e1db3` is green (Ubuntu `test` and all four `xcodebuild` shards, Actions runs 36742955839 / 36742955823). Left the pin at `expo@~57.0.25` rather than jumping to SDK 58 (released 2026-09-29) or regenerating the lockfile for the `57.0.26` patch. Publish workflows stay on this branch until merge so `main` does not auto-publish the SDK 55 line.

## [6.0.0] - 2026-09-26

Not published yet. Draft PR #210 (`cursor/sdk-57-upgrade-f2df`).

CI on head `7cf8866` (2026-09-29): Ubuntu `test` and all four macOS `xcodebuild` shards green (Actions runs 36596562357 / 36596562287).

Mac verification of the demo apps passed on `166512a`, including kitchen prebuild and `run:ios` on the iPhone 17 Pro simulator (widget, Live Activities, and app-clip-demo passed earlier). Signed entitlements and on-device behavior are still outside CI.

### Added

- Sharded macOS e2e matrix that `xcodebuild`s every templated target type (widgets, app clips, watchOS, Siri/App Intents, keyboard, Safari/content blocker, network extensions, Screen Time shields, plus sharing/files/media and system-service targets). Live Activities compile as part of the `widget` template.
- Ubuntu prebuild of the e2e fixture on every PR so a broken config plugin fails before Xcode.

### Changed

- Upgrade the plugin and demo apps from Expo SDK 55 to SDK 57 (`expo@~57.0.25`, React Native 0.86.3, React 19.2.3).
- `@bacons/apple-targets` peer dependency is now `expo: ">=57"`.
- Config plugin dependencies track SDK 57: `@expo/prebuild-config@~57.0.16`, `@expo/config-plugins@~57.0.9`, `@expo/image-utils@^0.11.5`.
- README requirement line: Xcode 26.4 and Expo SDK 57. Example `deploymentTarget` is `16.4` (SDK 57 iOS floor). Package default remains `18.0`.

### Fixed

- Narrow source-entitlements lookup so a missing file does not index `undefined`.
- Kitchen prebuild on SDK 57 threw `val.hasOwnProperty is not a function` for targets that ship a handwritten `*.entitlements` file. `@expo/plist` returns null-prototype objects, and those were stored on `extra.eas.build.experimental.ios.appExtensions`. They are now cloned into plain objects before they are attached to the Expo config.
- Kitchen `run:ios` failed in the app clip's "Bundle React Native code and images" script with an empty `NODE_BINARY` (`: command not found`). Every clip inherited that script, which sources `$PODS_ROOT/../.xcode.env`. CocoaPods sets `PODS_ROOT` only for targets integrated through `pods.rb`. Kitchen's clip is native SwiftUI and has no `pods.rb` (`pods.rb` is not skipped for clips; the template ships one, and `app-clip-demo` has it). `exportJs` now defaults on for clips only when `pods.rb` exists. Targets that do bundle JS also set `PODS_ROOT` to `$(SRCROOT)/Pods` so the script can still find `ios/.xcode.env` without a per-target Pods xcconfig. CocoaPods target names are sanitized like the Xcode target (`app-clip` → `appclip`).
- e2e Jest `globalSetup` passed a nested `{ compilerOptions }` object to ts-jest. TypeScript 6 rejects that as `TS5023`, so the macOS shards died before `xcodebuild`. The transform options are now a flat compiler-options map.
- macOS e2e ran the root `prepare` script, which does not compile `@bacons/apple-targets` under `expo-module-scripts` 56 (`expo-module prepare` is a no-op). Prebuild then failed with `Cannot find module './build/config-plugin'`. The workflow builds that package explicitly.

## [5.0.0] - 2026

Published line that shipped with Expo SDK 55.

### Changed

- SDK 55 alignment (`expo@^55`, React Native 0.83.x).

## [3.0.5] - create-target

Current published `create-target` version on `main` before the SDK 57 work.
