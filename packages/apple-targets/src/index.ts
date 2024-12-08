import { ConfigPlugin } from "@expo/config-plugins";
import { sync as globSync } from "glob";
import path from "path";

import type { Config, ConfigFunction } from "./config";
import { withPodTargetExtension } from "./withPodTargetExtension";
import withWidget from "./withWidget";
import { withXcodeProjectBetaBaseMod } from "./withXcparse";

export const withTargetsDir: ConfigPlugin<
  {
    appleTeamId?: string;
    match?: string;
    root?: string;
  } | void
> = (config, _props) => {
  const {
    appleTeamId = config?.ios?.appleTeamId,
    root = "./targets",
    match = "*",
  } = _props || {};
  if (!appleTeamId) {
    throw new Error(
      `You must specify an \`appleTeamId\` in your app config to use the \`withTargetsDir\` plugin.`
    );
  }
  const projectRoot = config._internal!.projectRoot;

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

    config = withWidget(config, {
      appleTeamId,
      ...evaluatedTargetConfigObject,
      directory: path.relative(projectRoot, path.dirname(configPath)),
      configPath,
    });
  });

  withPodTargetExtension(config);

  return withXcodeProjectBetaBaseMod(config);
};

export { Config, ConfigFunction };

module.exports = withTargetsDir;
