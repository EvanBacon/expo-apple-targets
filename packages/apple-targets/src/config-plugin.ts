import { ConfigPlugin } from "expo/config-plugins";
import { loadModuleSync } from "@expo/require-utils";
import { globSync } from "glob";
import path from "path";
import chalk from "chalk";

import type { Config, ConfigFunction } from "./config";
import { withPodTargetExtension } from "./with-pod-target-extension";
import withWidget from "./with-widget";
import { withXcodeProjectBetaBaseMod } from "./with-bacons-xcode";
import { warnOnce } from "./util";

// Highest-to-lowest priority. Used both for globbing and for the deterministic
// pick when multiple config files exist in the same target directory.
const TARGET_CONFIG_EXTENSIONS = [
  "ts",
  "mts",
  "cts",
  "mjs",
  "js",
  "cjs",
  "json",
] as const;

function loadTargetConfig(configPath: string): unknown {
  if (configPath.endsWith(".json")) {
    return require(configPath);
  }
  const mod = loadModuleSync(configPath);
  // Unwrap an ESM default export (e.g. `export default { ... }`).
  if (
    mod &&
    typeof mod === "object" &&
    (mod as { __esModule?: boolean }).__esModule &&
    "default" in mod
  ) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

export const withTargetsDir: ConfigPlugin<
  {
    appleTeamId?: string;
    match?: string;
    root?: string;
  } | void
> = (config, _props) => {
  let { appleTeamId = config?.ios?.appleTeamId } = _props || {};
  const { root = "./targets", match = "*" } = _props || {};
  const projectRoot = config._internal!.projectRoot;

  if (!config.ios?.bundleIdentifier) {
    const fallbackBundleId = `com.example.${config.slug}`;
    warnOnce(
      chalk`{yellow [bacons/apple-targets]} Expo config is missing {cyan ios.bundleIdentifier} property. Using fallback: {cyan ${fallbackBundleId}}. Add it to your app.json or app.config.js for production builds.`,
    );
    config.ios = config.ios || {};
    config.ios.bundleIdentifier = fallbackBundleId;
  }

  if (!appleTeamId) {
    warnOnce(
      chalk`{yellow [bacons/apple-targets]} Expo config is missing required {cyan ios.appleTeamId} property. Find this in Xcode and add to the Expo Config to correct. iOS builds may fail until this is corrected.`,
    );
  }

  const targets = globSync(
    `${root}/${match}/expo-target.config.@(${TARGET_CONFIG_EXTENSIONS.join("|")})`,
    {
      cwd: projectRoot,
      absolute: true,
    },
  );

  // Multiple config files in the same target directory would silently register
  // the target twice — pick the highest-priority extension and warn.
  const configsByDirectory = new Map<string, string[]>();
  for (const configPath of targets) {
    const dir = path.dirname(configPath);
    const list = configsByDirectory.get(dir);
    if (list) list.push(configPath);
    else configsByDirectory.set(dir, [configPath]);
  }

  const resolvedTargets: string[] = [];
  for (const [dir, configs] of configsByDirectory) {
    const sorted = [...configs].sort(
      (a, b) =>
        TARGET_CONFIG_EXTENSIONS.indexOf(
          path.extname(a).slice(1) as (typeof TARGET_CONFIG_EXTENSIONS)[number],
        ) -
        TARGET_CONFIG_EXTENSIONS.indexOf(
          path.extname(b).slice(1) as (typeof TARGET_CONFIG_EXTENSIONS)[number],
        ),
    );
    if (sorted.length > 1) {
      const ignored = sorted
        .slice(1)
        .map((p) => path.basename(p))
        .join(", ");
      warnOnce(
        chalk`{yellow [bacons/apple-targets]} Multiple {cyan expo-target.config} files in {cyan ${path.relative(projectRoot, dir)}}. Using {cyan ${path.basename(sorted[0])}} and ignoring: {cyan ${ignored}}`,
      );
    }
    resolvedTargets.push(sorted[0]);
  }

  resolvedTargets.forEach((configPath) => {
    const targetConfig = loadTargetConfig(configPath);
    let evaluatedTargetConfigObject: unknown = targetConfig;
    // If it's a function, evaluate it
    if (typeof targetConfig === "function") {
      evaluatedTargetConfigObject = (targetConfig as ConfigFunction)(config);

      if (
        !evaluatedTargetConfigObject ||
        typeof evaluatedTargetConfigObject !== "object"
      ) {
        throw new Error(
          `Expected target config function to return an object, but got ${typeof evaluatedTargetConfigObject}`,
        );
      }
    } else if (!targetConfig || typeof targetConfig !== "object") {
      throw new Error(
        `Expected target config to be an object or function that returns an object, but got ${typeof targetConfig}`,
      );
    }

    const resolvedConfig = evaluatedTargetConfigObject as Config;

    if (!resolvedConfig.type) {
      throw new Error(
        `Expected target config to have a 'type' property denoting the type of target it is, e.g. 'widget'`,
      );
    }

    config = withWidget(config, {
      appleTeamId,
      ...resolvedConfig,
      directory: path.relative(projectRoot, path.dirname(configPath)),
      configPath,
    });
  });

  withPodTargetExtension(config);

  withXcodeProjectBetaBaseMod(config);

  return config;
};

export { Config, ConfigFunction };

module.exports = withTargetsDir;
