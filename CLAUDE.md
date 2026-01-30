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
yarn                # Install dependencies (Yarn workspaces + Lerna)
yarn start          # Compile all packages in watch mode
```

## Build

```sh
# apple-targets
cd packages/apple-targets && expo-module build

# create-target
cd packages/create-target && yarn build   # uses @vercel/ncc
```

The root `yarn prepare` runs Lerna's prepare across all packages.

## Test

```sh
# apple-targets
cd packages/apple-targets && yarn test          # jest --watch

# create-target
cd packages/create-target && yarn test          # unit tests
cd packages/create-target && yarn test:e2e      # e2e tests
```

Test framework: Jest (Node environment). Tests live in `src/__tests__/` directories.

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

## Code Conventions

- TypeScript with strict mode (ES2019 target)
- Expo module scripts base ESLint config
- Prettier for formatting (defaults)
- MIT license
