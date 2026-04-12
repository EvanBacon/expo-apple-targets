import { ConfigPlugin } from "expo/config-plugins";
import { globSync } from "glob";
import path from "path";
import fs from "fs";
import chalk from "chalk";

import type { Config, ConfigFunction } from "./config";
import { withPodTargetExtension } from "./with-pod-target-extension";
import withWidget from "./with-widget";
import { withXcodeProjectBetaBaseMod } from "./with-bacons-xcode";
import { warnOnce } from "./util";

export const withTargetsDir: ConfigPlugin<
  {
    appleTeamId?: string;
    match?: string;
    root?: string;
    /**
     * Array of npm package names or paths that ship apple targets.
     * The plugin will search for `targets/* /expo-target.config.@(json|js)` in each location.
     * - Package names (e.g. "expo-screen-time") are resolved via require.resolve
     * - Paths starting with "." or "/" are resolved relative to project root
     * @example ["expo-screen-time"] - npm package
     * @example ["./node_modules/expo-screen-time", "../my-library"] - paths
     */
    libraryTargets?: string[];
  } | void
> = (config, _props) => {
  let { appleTeamId = config?.ios?.appleTeamId } = _props || {};
  const { root = "./targets", match = "*", libraryTargets = [] } = _props || {};
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

  // Find targets in the user's project
  const targets = globSync(`${root}/${match}/expo-target.config.@(json|js)`, {
    cwd: projectRoot,
    absolute: true,
  });

  // Find targets shipped by npm packages (libraries)
  const libraryTargetPaths = libraryTargets.flatMap((pkgNameOrPath) => {
    let pkgDir: string;

    // Check if it's a path (starts with . or /)
    if (pkgNameOrPath.startsWith(".") || pkgNameOrPath.startsWith("/")) {
      pkgDir = path.resolve(projectRoot, pkgNameOrPath);
      if (!fs.existsSync(pkgDir)) {
        warnOnce(
          chalk`{yellow [bacons/apple-targets]} Library path does not exist: {cyan ${pkgDir}}`
        );
        return [];
      }
    } else {
      // It's a package name - resolve via require.resolve
      try {
        const pkgJsonPath = require.resolve(`${pkgNameOrPath}/package.json`, {
          paths: [projectRoot],
        });
        pkgDir = path.dirname(pkgJsonPath);
      } catch (error) {
        warnOnce(
          chalk`{yellow [bacons/apple-targets]} Could not find library targets for package {cyan ${pkgNameOrPath}}: ${error}`
        );
        return [];
      }
    }

    const targets = globSync(`targets/*/expo-target.config.@(json|js)`, {
      cwd: pkgDir,
      absolute: true,
    });

    if (targets.length === 0) {
      warnOnce(
        chalk`{yellow [bacons/apple-targets]} No targets found in {cyan ${pkgDir}/targets/}`
      );
    }

    return targets;
  });

  targets.push(...libraryTargetPaths);

  targets.forEach((configPath) => {
    const targetConfig = require(configPath);
    let evaluatedTargetConfigObject = targetConfig;
    // If it's a function, evaluate it
    if (typeof targetConfig === "function") {
      evaluatedTargetConfigObject = targetConfig(config);

      // Allow config functions to return null/undefined to skip the target
      if (evaluatedTargetConfigObject === null || evaluatedTargetConfigObject === undefined) {
        return; // Skip this target
      }

      if (typeof evaluatedTargetConfigObject !== "object") {
        throw new Error(
          `Expected target config function to return an object, but got ${typeof evaluatedTargetConfigObject}`,
        );
      }
    } else if (typeof targetConfig !== "object") {
      throw new Error(
        `Expected target config to be an object or function that returns an object, but got ${typeof targetConfig}`,
      );
    }

    if (!evaluatedTargetConfigObject.type) {
      throw new Error(
        `Expected target config to have a 'type' property denoting the type of target it is, e.g. 'widget'`,
      );
    }

    config = withWidget(config, {
      appleTeamId,
      ...evaluatedTargetConfigObject,
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
