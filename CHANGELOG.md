# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions workflows to publish `@bacons/apple-targets` and `create-target` to npm (`publish.yml` beta on main / manual dispatch; `publish-stable.yml` manual dispatch on main only).
- Keep a Changelog file (requested in #128).

## [6.0.0] - 2026-09-26

Not published yet. Lives on draft PR #210 until e2e `xcodebuild` is green and a Mac verification pass is done.

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

## [5.0.0] - 2026

Published line that shipped with Expo SDK 55.

### Changed

- SDK 55 alignment (`expo@^55`, React Native 0.83.x).

## [3.0.5] - create-target

Current published `create-target` version on `main` before the SDK 57 work.
