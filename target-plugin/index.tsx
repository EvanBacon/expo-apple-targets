import { ConfigPlugin } from "@expo/config-plugins";
import { sync as globSync } from "glob";
import path from "path";
import withWidget from "./withWidget";

import { withXcodeProjectBetaBaseMod } from "./withXcparse";

export const withTargetsDir: ConfigPlugin<{
  appleTeamId: string;
  match?: string;
}> = (config, { appleTeamId, match = "*" }) => {
  const projectRoot = config._internal.projectRoot;

  const targets = globSync(`./targets/${match}/expo-target.config.@(json|js)`, {
    cwd: projectRoot,
    absolute: true,
  });

  targets.forEach((configPath) => {
    config = withWidget(config, {
      appleTeamId: appleTeamId,
      ...require(configPath),
      directory: path.relative(projectRoot, path.dirname(configPath)),
    });
  });

  return withXcodeProjectBetaBaseMod(config);
};

export default withTargetsDir;