/**
 * Config plugin base mod for Xcode project manipulation
 * Integrates with Expo's prebuild system
 */

import { XcodeProject } from "@bacons/xcode";
import * as xcodeParse from "@bacons/xcode/json";
import {
  BaseMods,
  ConfigPlugin,
  createRunOncePlugin,
  IOSConfig,
  Mod,
  withMod,
} from "@expo/config-plugins";
import * as fs from "fs";

const SPM_MOD_NAME = "xcodeProjectSpm";

/**
 * Config plugin that provides access to the Xcode project via a custom mod
 *
 * Usage:
 * ```ts
 * withXcodeProjectMod(config, async (config) => {
 *   const project = config.modResults;
 *   // Manipulate project here
 *   return config;
 * });
 * ```
 */
export const withXcodeProjectMod: ConfigPlugin<Mod<XcodeProject>> = (
  config,
  action
) => {
  return withMod(config, {
    platform: "ios",
    mod: SPM_MOD_NAME,
    action,
  });
};

/**
 * Internal base mod implementation
 * Sets up the infrastructure for reading and writing Xcode projects
 */
const withXcodeProjectBaseModInternal: ConfigPlugin = (config) => {
  return BaseMods.withGeneratedBaseMods(config, {
    platform: "ios",
    saveToInternal: true,
    skipEmptyMod: false,
    providers: {
      [SPM_MOD_NAME]: BaseMods.provider<XcodeProject>({
        isIntrospective: false,

        // Get the path to the Xcode project
        async getFilePath({ _internal }) {
          if (!_internal?.projectRoot) {
            throw new Error("Project root not found in config");
          }
          return IOSConfig.Paths.getPBXProjectPath(_internal.projectRoot);
        },

        // Read and parse the Xcode project file
        async read(filePath) {
          try {
            return XcodeProject.open(filePath);
          } catch (error: any) {
            throw new Error(
              `Failed to parse Xcode project at "${filePath}": ${error.message}`
            );
          }
        },

        // Write the modified Xcode project back to disk
        async write(filePath, { modResults, modRequest: { introspect } }) {
          // Skip writing in introspection mode
          if (introspect) {
            return;
          }

          try {
            // Serialize the project to the pbxproj format
            const contents = xcodeParse.build(modResults.toJSON());

            if (contents.trim().length === 0) {
              throw new Error("Serialized Xcode project is empty");
            }

            // Write to disk
            await fs.promises.writeFile(filePath, contents, "utf8");
          } catch (error: any) {
            throw new Error(
              `Failed to write Xcode project to "${filePath}": ${error.message}`
            );
          }
        },
      }),
    },
  });
};

/**
 * Base mod that enables Xcode project manipulation for SPM
 * This should be included once in the plugin chain
 *
 * Export as a run-once plugin to ensure it's only registered once
 */
export const withXcodeProjectBaseMod = createRunOncePlugin(
  withXcodeProjectBaseModInternal,
  "withXcodeProjectSpmBaseMod"
);
