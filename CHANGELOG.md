# Changelog

All notable changes to `@bacons/apple-targets` are documented in this file.
This changelog was requested in [#128](https://github.com/EvanBacon/expo-apple-targets/issues/128).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [5.0.0]

### Added

- Added target types for content blockers, network extensions, file providers, broadcast extensions, call directories, message filters, Quick Look previews, Spotlight delegates, Screen Time shields, smart cards, print services, and authentication services ([#162](https://github.com/EvanBacon/expo-apple-targets/pull/162), [#163](https://github.com/EvanBacon/expo-apple-targets/pull/163), [#164](https://github.com/EvanBacon/expo-apple-targets/pull/164), [#165](https://github.com/EvanBacon/expo-apple-targets/pull/165), [#166](https://github.com/EvanBacon/expo-apple-targets/pull/166)).
- Added watch widget extensions, Swift package dependencies, and shared target directories ([#121](https://github.com/EvanBacon/expo-apple-targets/pull/121), [#122](https://github.com/EvanBacon/expo-apple-targets/pull/122), [#126](https://github.com/EvanBacon/expo-apple-targets/pull/126), [#168](https://github.com/EvanBacon/expo-apple-targets/pull/168)).
- Added automatic detection of SF Symbol SVGs in image configuration ([#184](https://github.com/EvanBacon/expo-apple-targets/pull/184)).

### Changed

- Upgraded the plugin and demo apps to Expo SDK 55 ([#185](https://github.com/EvanBacon/expo-apple-targets/pull/185)).

### Fixed

- Corrected watchOS target detection and embedding so watch apps and extensions are embedded in the appropriate targets and locations ([#169](https://github.com/EvanBacon/expo-apple-targets/pull/169), [#172](https://github.com/EvanBacon/expo-apple-targets/pull/172), [#176](https://github.com/EvanBacon/expo-apple-targets/pull/176), [#178](https://github.com/EvanBacon/expo-apple-targets/pull/178), [#179](https://github.com/EvanBacon/expo-apple-targets/pull/179)).
- Set the app icon build setting for Safari and widget targets and warn about the unsafe `TRUEPREDICATE` share-extension activation rule ([#154](https://github.com/EvanBacon/expo-apple-targets/pull/154), [#158](https://github.com/EvanBacon/expo-apple-targets/pull/158)).
