import {
  BaseMods,
  ConfigPlugin,
  IOSConfig,
  Mod,
  withMod,
} from "@expo/config-plugins";
import * as fs from "fs";
import * as xcodeParse from "@bacons/xcode/json";
import { XcodeProject } from "@bacons/xcode";

const customModName = "xcodeProjectBeta";

export const withXcodeProjectBeta: ConfigPlugin<Mod<XcodeProject>> = (
  config,
  action
) => {
  return withMod(config, {
    platform: "ios",
    mod: customModName,
    action,
  });
};

export const withXcodeProjectBetaBaseMod: ConfigPlugin = (config) => {
  return BaseMods.withGeneratedBaseMods(config, {
    platform: "ios",
    saveToInternal: true,
    skipEmptyMod: false,
    providers: {
      // Append a custom rule to supply AppDelegate header data to mods on `mods.ios.AppClipInfoPlist`
      [customModName]: BaseMods.provider<XcodeProject>({
        isIntrospective: true,
        async getFilePath({ modRequest }) {
          return IOSConfig.Paths.getPBXProjectPath(modRequest.projectRoot);
        },
        async read(filePath) {
          return XcodeProject.open(filePath);
        },
        async write(filePath, { modResults, modRequest: { introspect } }) {
          if (introspect) {
            return;
          }
          await fs.promises.writeFile(
            filePath,
            xcodeParse.build(modResults.toJSON())
          );
        },
      }),
    },
  });
};
