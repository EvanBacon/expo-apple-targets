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

**Adding a new target type:** See "Adding a new target type" under Key Architecture below.

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

### Central Target Registry (`src/target.ts`)

All extension type metadata lives in a single `TARGET_REGISTRY` object. Everything else is derived from it:

- `ExtensionType` = `keyof typeof TARGET_REGISTRY`
- `KNOWN_EXTENSION_POINT_IDENTIFIERS` — derived from `extensionPointIdentifier` fields
- `SHOULD_USE_APP_GROUPS_BY_DEFAULT` — derived from `appGroupsByDefault` fields
- `productTypeForType()` / `needsEmbeddedSwift()` / `getFrameworksForType()` — one-liner lookups into the registry
- CLI `TARGETS` array in `create-target/src/promptTarget.ts` — derived from registry
- E2E `ALL_EXTENSION_TYPES` in `e2e/__tests__/build.test.ts` — derived from registry

### Adding a new target type

1. **Add an entry to `TARGET_REGISTRY`** in `packages/apple-targets/src/target.ts`. This is the only required code change — the `ExtensionType` union, extension point ID map, CLI target list, and e2e coverage check all derive automatically. Fields:
   - `extensionPointIdentifier` — the Apple `NSExtensionPointIdentifier` string (omit for app clips / watch apps / types that share IDs with other types)
   - `productType` — defaults to `com.apple.product-type.app-extension` if omitted
   - `needsEmbeddedSwift` — set `true` if the extension needs `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES`
   - `frameworks` — system frameworks to link (e.g. `["WidgetKit", "SwiftUI"]`)
   - `appGroupsByDefault` — set `true` if extension should sync app groups from main target
   - `hasNoTemplate` — set `true` to exclude from CLI and e2e tests (e.g. `imessage`)
   - `displayName` / `description` — used in the `create-target` CLI prompt

2. **Add a case to `getTargetInfoPlistForType()`** in `src/target.ts` if the extension needs custom Info.plist content (most do — only widget and bg-download use the default). The switch is not exhaustive so new types fall through to a default `{ NSExtension: { NSExtensionPointIdentifier } }`.

3. **Add a case to `getConfigurationListBuildSettingsForType()`** in `src/configuration-list.ts`. This switch IS exhaustive (`never` check) — TypeScript will error if a new type is missing. Most types can fall through to `createDefaultConfigurationList()`.

4. **Update `isNativeTargetOfType()`** in `src/target.ts` if the new type shares an `extensionPointIdentifier` with another type (e.g. `watch-widget` shares `com.apple.widgetkit-extension` with `widget`). Add logic to disambiguate based on build settings like `WATCHOS_DEPLOYMENT_TARGET`.

5. **Create Swift template files** in `packages/create-target/templates/<type>/`. These are the source-of-truth files that get copied both by `create-target` CLI and e2e test setup.

6. **Create e2e fixture config** at `packages/apple-targets/e2e/fixture/targets/<type>/expo-target.config.json` with `{ "type": "<type>" }`.

7. **Add an entry to `TARGET_REGISTRY`** (the e2e one) in `e2e/__tests__/build.test.ts` with `type`, `dir`, `target` (hyphens stripped), and optionally `sdk`/`skip`.

8. **Update documentation**:
   - Add the new type to the "Supported types" table in `README.md` (the root README is symlinked to `packages/apple-targets/README.md`)
   - Keep the table alphabetically sorted within logical groupings (widgets together, network extensions together, etc.)

9. **Run `bunx expo-module build`** in `packages/apple-targets/` so that `create-target` picks up the updated build output.

10. **Run tests** to verify everything works:
    - `bun test` — unit tests
    - `bun test:e2e --testNamePattern="<type>"` — e2e build test for the new type

### Discovering new extension types from Xcode

Run `bun scripts/scan-xcode-targets.ts --diff` to compare the locally installed Xcode's extension templates against `TARGET_REGISTRY`. This shows which Apple extension types exist in Xcode but aren't yet supported. See `docs/xcode-target-discovery.md` for details on how Xcode stores this data (xcspec files, TemplateInfo.plist structure, etc.).

## Research & Documentation

- `docs/xcode-target-discovery.md` — How Xcode stores target/extension type definitions (xcspec files, template plists, extension point identifiers, platform template directories)
- `scripts/scan-xcode-targets.ts` — Bun script that scans Xcode.app to enumerate all product types and extension templates. Run with `--diff` to compare against `TARGET_REGISTRY`.

## Code Conventions

- TypeScript with strict mode (ES2019 target)
- Bun-maxxing, use Bun for everything you can.
- Expo module scripts base ESLint config
- Prettier for formatting (defaults)

## Opening PRs

- Branch format: `@<githubusername>/<package>/<description>`, e.g. `@evanbacon/apple-targets/add-widget-support`
- Commit messages: Conventional Commits format, e.g. `feat(targets): add support for widgets`
