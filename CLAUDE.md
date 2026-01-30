# CLAUDE.md

## Project Overview

Expo Config Plugin monorepo for generating native Apple Targets (Widgets, App Clips, Share Extensions, Watch apps, etc.) and linking them outside the `/ios` directory. Uses Continuous Native Generation (CNG) to keep target source files outside the generated iOS project.

## Repository Structure

```
packages/
  apple-targets/   # Main Expo Config Plugin (@bacons/apple-targets)
  create-target/   # CLI tool for scaffolding targets (bunx create-target)
apps/              # Demo apps (widget-demo, app-clip-demo, etc.)
```

## Development Setup

```sh
bun install         # Install dependencies (Bun workspaces)
bun start           # Compile all packages in watch mode
```

## Build

```sh
# apple-targets
cd packages/apple-targets && expo-module build

# create-target
cd packages/create-target && bun run build   # uses @vercel/ncc
```

The root `bun run prepare` runs prepare across all packages.

## Test

```sh
# apple-targets
cd packages/apple-targets && bun test          # jest --watch

# create-target
cd packages/create-target && bun test          # unit tests
cd packages/create-target && bun run test:e2e  # e2e tests
```

Test framework: Jest (Node environment). Tests live in `src/__tests__/` directories.

### E2E Build Tests (apple-targets)

```sh
cd packages/apple-targets && bun run test:e2e  # requires macOS + Xcode
```

Runs `expo prebuild` on a fixture project with all 24 target types, then `xcodebuild build` per target. Requires macOS with Xcode installed (CI uses `macos-15`).

**How it works:**
- `e2e/fixture/` contains only `expo-target.config.*` files and `app.json`/`package.json`
- Swift source files are copied at runtime from `packages/create-target/templates/` (single source of truth)
- `e2e/setup.ts` copies fixture to a temp dir, installs deps, runs prebuild
- `e2e/__tests__/build.test.ts` has a `TARGET_REGISTRY` array — one `it()` per target type
- Exception: `clip/AppDelegate.swift` is a custom non-RN override in the fixture

**Adding a new target type:**
1. Add the template to `packages/create-target/templates/<type>/`
2. Add an `expo-target.config.json` to `e2e/fixture/targets/<type>/`
3. Add an entry to `TARGET_REGISTRY` in `e2e/__tests__/build.test.ts`
4. The meta-test will fail if `TARGET_REGISTRY` doesn't cover all `ExtensionType` values

**Updating templates after SDK changes:**
No action needed — templates are copied from `create-target/templates/` at runtime, so updating the template source automatically updates the e2e tests.

## Lint & Typecheck

```sh
expo-module lint        # ESLint via expo-module-scripts
expo-module typecheck   # TypeScript type checking
bunx tsc --noEmit        # Alternative typecheck
```

## Key Architecture

- **Config plugins** (`src/with-*.ts`): Expo dangerous mods that manipulate the Xcode project
- **Icon generation** (`src/icon/`): Generates xcassets from local files or URLs using `@expo/image-utils`
- **Color assets** (`src/colorset/`): Generates xcassets colorsets from CSS color strings
- **Xcode manipulation**: Uses `@bacons/xcode` for project file editing
- **Target config**: Each target has an `expo-target.config.js` defining type, icon, colors, entitlements, etc.

## Research & Documentation

- `docs/xcode-target-discovery.md` — How to discover all Apple target/extension types from the local Xcode installation (xcspec files, template plists, extension point identifiers)
- `scripts/scan-xcode-targets.ts` — Bun script that scans Xcode.app to enumerate all product types and extension templates. Run with `--diff` to compare against the project's `ExtensionType` enum.

## Code Conventions

- TypeScript with strict mode (ES2019 target)
- Bun-maxxing, use Bun for everything you can.
- Expo module scripts base ESLint config
- Prettier for formatting (defaults)

## Opening PRs

- Branch format: `@<githubusername>/<package>/<description>`, e.g. `@evanbacon/apple-targets/add-widget-support`
- Commit messages: Conventional Commits format, e.g. `feat(targets): add support for widgets`
