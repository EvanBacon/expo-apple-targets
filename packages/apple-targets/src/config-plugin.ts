import { ConfigPlugin } from "@expo/config-plugins";
import { globSync } from "glob";
import path from "path";
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
  } | void
> = (config, _props) => {
  let { appleTeamId = config?.ios?.appleTeamId } = _props || {};
  const { root = "./targets", match = "*" } = _props || {};
  const projectRoot = config._internal!.projectRoot;

  if (!appleTeamId) {
    warnOnce(
      chalk`{yellow [bacons/apple-targets]} Expo config is missing required {cyan ios.appleTeamId} property. Find this in Xcode and add to the Expo Config to correct. iOS builds may fail until this is corrected.`
    );
  }

  const targets = globSync(`${root}/${match}/expo-target.config.@(json|js)`, {
    // const targets = globSync(`./targets/action/expo-target.config.@(json|js)`, {
    cwd: projectRoot,
    absolute: true,
  });

  targets.forEach((configPath) => {
    const targetConfig = require(configPath);
    let evaluatedTargetConfigObject = targetConfig;
    // If it's a function, evaluate it
    if (typeof targetConfig === "function") {
      evaluatedTargetConfigObject = targetConfig(config);

      if (typeof evaluatedTargetConfigObject !== "object") {
        throw new Error(
          `Expected target config function to return an object, but got ${typeof evaluatedTargetConfigObject}`
        );
      }
    } else if (typeof targetConfig !== "object") {
      throw new Error(
        `Expected target config to be an object or function that returns an object, but got ${typeof targetConfig}`
      );
    }

    if (!evaluatedTargetConfigObject.type) {
      throw new Error(
        `Expected target config to have a 'type' property denoting the type of target it is, e.g. 'widget'`
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
