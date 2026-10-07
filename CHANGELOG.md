# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions workflows to publish `@bacons/apple-targets` and `create-target` to npm (`publish.yml` beta on main / manual dispatch; `publish-stable.yml` manual dispatch on main only). Both require the `NPM_TOKEN` repository secret before the first publish.
- Keep a Changelog file (requested in #128).
- README section listing which target types each macOS e2e shard compiles, and what CI cannot sign or run on device.
- Unit test that the macOS e2e workflow matrix lists exactly the `TARGET_GROUPS` shard names, so a new group cannot ship without a matching CI job.
- `launch.yml`: macOS matrix that prebuilds widget-demo, live-activities-demo, app-clip-demo, and kitchen, asserts the host `UIApplicationSceneManifest` points at `EXExpoAppSceneDelegate`, installs the unsigned simulator build, and fails if the process is gone after 12 seconds. This is the SDK 57 launch gate. It still does not sign entitlements or cover a physical device.

### Changed

- 2026-10-07: expanded the simulator launch job from widget-demo only to all four demos. widget-demo already stayed up on macos-26 (Actions run [37494824676](https://github.com/EvanBacon/expo-apple-targets/actions/runs/37494824676)). Merge stays blocked until the other three finish green. Did not re-email about `NPM_TOKEN`.
- 2026-10-06: added the widget-demo simulator launch job on draft #210. Prior Mac Mini launch failure (no scene manifest) is addressed by `enableSceneSupport` on the demos; this job is the re-verify. Not merged. Did not re-email about `NPM_TOKEN` (notes on 2026-09-29 and 2026-10-01 are still unanswered).
- 2026-10-05: the e2e fixture install no longer floats `@typescript-eslint/*`. `eslint-config-universe@15.2.0` (via `expo-module-scripts`, a devDependency of the `file:` plugin) depends on `^8.59.0`, and Bun 1.4.2 resolved that to `8.71.1` while npm did not yet have `@typescript-eslint/visitor-keys` and `@typescript-eslint/typescript-estree` at that version (`package exists`, no matching version). The fixture now overrides those packages to `8.70.1` (the root lockfile pin) and commits `e2e/fixture/bun.lock`. `e2e/setup.ts` retargets the `file:` link inside that lockfile and runs `bun install --frozen-lockfile`.
- 2026-10-05: regenerated `bun.lock` with Bun 1.4.2 (`bun install --ignore-scripts`) so `bun install --frozen-lockfile --ignore-scripts` matches GitHub Actions. Workflows pin `oven-sh/setup-bun` to `1.4.2` and keep `--frozen-lockfile`.
- 2026-10-05: publish workflows no longer always `patch++`. If `package.json` is strictly newer than npm `dist-tags.latest` (a missing latest counts as `0.0.0`), that local version is published with no extra bump, so the first `@bacons/apple-targets` stable release stays **6.0.0** and the beta tag is `6.0.0-beta.<run>.<attempt>`. When local is less than or equal to published, they still bump the patch of the higher version. Stable still writes the chosen version back into `package.json` and commits only when it changed. `NPM_TOKEN` stays fail-closed. Ubuntu `test` and macOS e2e now install with `bun install --frozen-lockfile`.
- 2026-10-05: closed duplicate PRs. #190 closed in favor of #205 (ESM / TypeScript `expo-target.config`). #189 closed in favor of #204 (`infoPlist`). An earlier note dated the #190 close as 2026-10-03; that was wrong. #205 and #204 stay open.
- 2026-10-05: Mac Mini control experiment finished. A stock `create-expo-app` blank-typescript app on Expo **57.0.26** with no `@bacons/apple-targets`, Xcode 27.0, and iPhone 18 Pro iOS 27.2 prebuilt and built, then failed to launch with `UIScene life cycle is required for apps built with this SDK` and no `UIApplicationSceneManifest`. The same control with `expo-build-properties` and `ios.enableSceneSupport: true` writes `UIApplicationSceneManifest` → `EXExpoAppSceneDelegate` and stays open in launchctl. Scene support is opt-in in SDK 57 (`expo` ≥ ~57.0.23) and the default in SDK 58. The plugin does not strip that key from the host Info.plist (`INFOPLIST_KEY_UIApplicationSceneManifest_Generation` is only an app-clip target build setting). widget-demo, live-activities-demo, app-clip-demo, and kitchen now depend on `expo-build-properties@~57.0.22` and opt in. This is Expo host config, not a target-generation fix. widget-demo launch re-verify passed in CI on 2026-10-06; the other demos are in the same job as of 2026-10-07.
- 2026-10-05: Mac Mini verify on tip `79bba71`. Xcode 27.0 (27A266a), iPhone 18 Pro iOS 27.2. widget-demo, live-activities-demo, app-clip-demo, and kitchen all **prebuild + xcodebuild PASS**, install OK, **launch FAIL** with `Application failed to launch: UIScene life cycle is required for apps built with this SDK` (no `UIApplicationSceneManifest` in the host Info.plist). Extensions still compile. Earlier MacBook Xcode 27.1 verify on `166512a` launched. The blank SDK 57 control finished later; the launch failure is upstream Expo scene opt-in, not this plugin.
- 2026-10-05: CI green on `79bba71`. Ubuntu `test` run [37216355144](https://github.com/EvanBacon/expo-apple-targets/actions/runs/37216355144). e2e shards run [37216355137](https://github.com/EvanBacon/expo-apple-targets/actions/runs/37216355137).
- 2026-10-04: reconfirmed draft #210. Head `c3f72c4` CI is green (Ubuntu `test` run 37136357057 and all four `xcodebuild` shards in run 37136357009). npm `expo@57.0.26` is still the `latest` / `sdk-57` tag and already satisfies `expo@~57.0.25`, so the pin was not bumped. SDK 58 (`expo@58.0.3`, `next` tag) stays out of scope. Publish workflows stay on this branch until merge so `main` does not auto-publish the SDK 55 line. Did not re-email about `NPM_TOKEN`; the 2026-09-29 and 2026-10-01 notes are still unanswered, and the Actions secrets API still cannot be read from this account (403).
- 2026-10-03: reconfirmed draft #210 while #190 and #205 were both still open. #205 still needed a rebase onto this SDK 57 branch. The #190 close is 2026-10-05, not this date.
- Reconfirmed draft #210 on 2026-10-03. Head `faf0606` CI was green (Ubuntu `test` run 37033228909 and all four `xcodebuild` shards in run 37033229207). npm `expo@57.0.26` is the current SDK 57 patch and already satisfies `expo@~57.0.25`, so the pin was not bumped and the lockfile was not regenerated. SDK 58 (`expo@58.0.2`, `next` tag) stays out of scope. Publish workflows stay on this branch until merge so `main` does not auto-publish the SDK 55 line. Did not re-email about `NPM_TOKEN`; the 2026-09-29 and 2026-10-01 notes are still unanswered.
- Reconfirmed draft #210 on 2026-10-02. CI on `f338615` was green (Ubuntu `test` and all four `xcodebuild` shards, Actions runs 36895948825 / 36895948813). Left the pin at `expo@~57.0.25` rather than jumping to SDK 58 or regenerating the lockfile for a 57 patch. Publish workflows stay on this branch until merge so `main` does not auto-publish the SDK 55 line. Did not re-email about `NPM_TOKEN`; the 2026-09-29 and 2026-10-01 notes are still unanswered, and the Actions secrets API still cannot be read from this account (403).

### Fixed

- Documented a CI gap: `device-activity-report` is not a template in this repo yet (open PR #208). The e2e matrix compiles `device-activity-monitor`, `shield-action`, and `shield-config`, but not a report extension. Do not treat Screen Time coverage as complete until #208 lands and gets a shard entry.

## [6.0.0] - 2026-09-26

Not published yet. Draft PR #210 (`cursor/sdk-57-upgrade-f2df`).

CI on head `7cf8866` (2026-09-29): Ubuntu `test` and all four macOS `xcodebuild` shards green (Actions runs 36596562357 / 36596562287).

Mac verification of the demo apps passed on `166512a`, including kitchen prebuild and `run:ios` on the iPhone 17 Pro simulator (widget, Live Activities, and app-clip-demo passed earlier). A later Mac Mini check on `79bba71` built and installed those demos but failed at launch (see Unreleased). That failure matches a blank Expo 57 app under Xcode 27 / iOS 27, and the demos now opt into `enableSceneSupport`. Launch re-verify is `launch.yml` (all four demos). Signed entitlements and on-device behavior are still outside CI. This release stays **6.0.0** and is not published yet.

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
