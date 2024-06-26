import { ConfigPlugin } from "@expo/config-plugins";
import { sync as globSync } from "glob";
import path from "path";

import type { Config } from "./config";
import withWidget, { Props } from "./withWidget";
import { withXcodeProjectBetaBaseMod } from "./withXcparse";

// A target can depend on another target using the `dependencyTargets` property.
// Therefor, we need to execute the targets in the right order.
const sortTargetProps = (configs: Props[]) => {
  const targetMap = new Map();
  configs.forEach((target) => targetMap.set(target.name, target));

  const visited = new Set();
  const sorted: Props[] = [];

  function visit(config: Props) {
    if (visited.has(config.name)) {
      return;
    }
    visited.add(config.name);

    if (config.dependencyTargets) {
      config.dependencyTargets.forEach((depName) => {
        if (targetMap.has(depName)) {
          visit(targetMap.get(depName));
        }
      });
    }

    sorted.push(config);
  }

  configs.forEach((target) => visit(target));
  return sorted;
};

export const withTargetsDir: ConfigPlugin<{
  appleTeamId: string;
  match?: string;
  root?: string;
}> = (config, { appleTeamId, root = "./targets", match = "*" }) => {
  const projectRoot = config._internal!.projectRoot;

  const targets = globSync(`${root}/${match}/expo-target.config.@(json|js)`, {
    // const targets = globSync(`./targets/action/expo-target.config.@(json|js)`, {
    cwd: projectRoot,
    absolute: true,
  });

  const targetProps = targets.map((configPath) => ({
    appleTeamId,
    ...require(configPath),
    directory: path.relative(projectRoot, path.dirname(configPath)),
  }));

  const sortedTargetProps = sortTargetProps(targetProps);

  // Now we need to reverse the targets order. Thats because we will call withMod consecutively.
  // When we call withMod#1 then withMod#2, the execution order of the mods will be withMod#2 then withMod#1.
  // Thus we have to reverse …
  sortedTargetProps.reverse();

  sortedTargetProps.forEach((targetConfig) => {
    config = withWidget(config, targetConfig);
  });

  return withXcodeProjectBetaBaseMod(config);
};

export { Config };

module.exports = withTargetsDir;
