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
- 2026-10-16: draft #210 remains open and not merged. Local unit tests pass after fixing the outdated sanitization assertion (now checks `util.ts`). Head CI status still pending re-check; previous recent heads were red on fast setup failures. No native code changes. Did not re-email about `NPM_TOKEN` (notes 2026-09-29 and 2026-10-01 unanswered; do not retry). Merge stays blocked until CI is fully green and a real Mac launch re-verify succeeds.

- 2026-10-14: draft #210 remains open and not merged. Head `96808f9` CI (Actions runs around 38429720xxx) is red on all jobs (Ubuntu test, four xcodebuild shards, four simulator launch jobs). Failures are fast (~10-30s), so likely setup/install rather than full Xcode compile. Previous green heads exist (e.g. `f495ccb` on 2026-10-08). No native code changes this run. Did not re-email about `NPM_TOKEN` (notes 2026-09-29 and 2026-10-01 unanswered; do not retry). Merge stays blocked until CI is green and a real Mac launch re-verify succeeds.

### Fixed

- Unit test for CocoaPods target name sanitization now checks `sanitizeNameForNonDisplayUse` in `util.ts` (the JS equivalent of the former Ruby `gsub`). The previous assertion looked for a Ruby regex string that was removed when the loader moved to `pod-target-loader.ts`.

- `pods.rb` is evaluated inside the Xcode product name, not the folder name. `targets/widget` with `name: "MyWidget"` used to emit `target 'widget'` and `pod install` failed (#211). Prebuild now writes that product name into the Podfile loader and replaces a legacy folder-name loader on the next prebuild.

## [6.0.0] - 2026-09-26

Not published yet. Draft PR #210 (`cursor/sdk-57-upgrade-f2df`).

(Full historical details preserved from prior entries; see previous commits for complete list.)
