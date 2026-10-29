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

- 2026-10-29: Maintainer status check. Draft PR #210 (head `0a6ee6d`) remains open. CI fully green on all 9 checks (Ubuntu test + 4 xcodebuild shards + 4 simulator launch jobs, Actions runs around 40724507xxx from 2026-10-28). Publish workflows in place (beta auto/manual, stable manual-only); NPM_TOKEN still unconfirmed (no further email per prior notes). Changelog maintained. Not merged — safety rules require own Mac/Xcode verification of latest head before merge. One focused item: status update only, no code or native changes.

- 2026-10-28: Maintainer status check. Draft PR #210 (head `0fdd50c`) remains open. CI fully green on all 9 checks (Ubuntu test + 4 xcodebuild shards + 4 simulator launch jobs, Actions runs around 40541189xxx). Publish workflows in place (beta auto/manual, stable manual-only); NPM_TOKEN still unconfirmed (no further email per prior notes). Changelog maintained. Not merged — safety rules require own Mac/Xcode verification of latest head before merge. Triaged #211 (fixed in this branch; commented). One focused item: status + issue triage, no native code changes.

- 2026-10-27: Maintainer status check. Draft PR #210 (head `1d2d6ba`) remains open. CI green on all checks (test, 4 macOS e2e shards, simulator launch). Publish workflows present and fail-closed on missing NPM_TOKEN (still unconfirmed; no further email). Changelog and #212 notes already folded. Not merged; waiting on final Mac re-verify of latest head if desired and NPM_TOKEN. One focused item this run: status only, no code changes.

- 2026-10-25: `publish-stable.yml` now runs `npm view <pkg>@<local version>` before each package publish and skips that package if the version already exists on npm, instead of patch-bumping and republishing. A re-run after a partial publish no longer fails or ships an extra version, and an unchanged `create-target` is no longer republished on every stable run. To cut a new stable release, bump the version in `package.json` first. Draft #210 stays open and is not merged. Did not re-email about `NPM_TOKEN`.

