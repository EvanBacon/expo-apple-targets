import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import plist from "@expo/plist";
import fs from "fs";
import { globSync } from "glob";
import path from "path";
import chalk from "chalk";

import { withIosColorset } from "./colorset/with-ios-colorset";
import { Config, Entitlements } from "./config";
import { withImageAsset } from "./icon/with-image-asset";
import { withIosIcon } from "./icon/with-ios-icon";
import {
  getFrameworksForType,
  getTargetInfoPlistForType,
  SHOULD_USE_APP_GROUPS_BY_DEFAULT,
} from "./target";
import { withEASTargets } from "./with-eas-credentials";
import { withXcodeChanges } from "./with-xcode-changes";
import {
  getSanitizedBundleIdentifier,
  LOG_QUEUE,
  logOnce,
  sanitizeNameForNonDisplayUse,
  warnOnce,
} from "./util";
import type { DeviceFamily } from "./configuration-list";

type Props = Config & {
  directory: string;
  configPath: string;
};

const DEFAULT_DEPLOYMENT_TARGET = "18.0";

const withWidget: ConfigPlugin<Props> = (config, props) => {
  LOG_QUEUE.add(() =>
    warnOnce(
      chalk`\nUsing experimental Config Plugin {bold @bacons/apple-targets} that is subject to breaking changes.`
    )
  );

  // TODO: Magically based on the top-level folders in the `ios-widgets/` folder

  if (props.icon && !/https?:\/\//.test(props.icon)) {
    props.icon = path.join(props.directory, props.icon);
  }

  // This value should be used for the target name and other internal uses.
  const targetDirName = path.basename(path.dirname(props.configPath));

  // Sanitized for general usage. This name just needs to resemble the input value since it shouldn't be used for user-facing values such as the home screen or app store.
  const productName =
    sanitizeNameForNonDisplayUse(props.name || targetDirName) ||
    sanitizeNameForNonDisplayUse(targetDirName) ||
    sanitizeNameForNonDisplayUse(props.type);

  // This should never happen.
  if (!productName) {
    throw new Error(
      `[bacons/apple-targets][${props.type}] Target name does not contain any valid characters: ${targetDirName}`
    );
  }

  // TODO: Are there characters that aren't allowed in `CFBundleDisplayName`?
  const targetDisplayName = props.name ?? productName;

  const targetDirAbsolutePath = path.join(
    config._internal?.projectRoot ?? "",
    props.directory
  );

  const entitlementsFiles = globSync("*.entitlements", {
    absolute: true,
    cwd: targetDirAbsolutePath,
  });

  if (entitlementsFiles.length > 1) {
    throw new Error(
      `[bacons/apple-targets][${props.type}] Found more than one '*.entitlements' file in ${targetDirAbsolutePath}`
    );
  }

  let entitlementsJson: undefined | Entitlements = props.entitlements;

  if (entitlementsJson) {
    // Apply default entitlements that must be present for a target to work.
    const applyDefaultEntitlements = (
      entitlements: Entitlements
    ): Entitlements => {
      if (props.type === "clip") {
        entitlements["com.apple.developer.parent-application-identifiers"] = [
          `$(AppIdentifierPrefix)${config.ios!.bundleIdentifier!}`,
        ];

        // Try to extract the linked website from the original associated domains:

        const associatedDomainsKey = "com.apple.developer.associated-domains";
        // If the target doesn't explicitly define associated domains, then try to use the main app's associated domains.
        if (!entitlements[associatedDomainsKey]) {
          const associatedDomains =
            config.ios?.associatedDomains ??
            config.ios?.entitlements?.[
              "com.apple.developer.associated-domains"
            ];

          if (
            !associatedDomains ||
            !Array.isArray(associatedDomains) ||
            associatedDomains.length === 0
          ) {
            warnOnce(
              chalk`{yellow [${targetDirName}]} Apple App Clip may require the associated domains entitlement but none were found in the Expo config.\nExample:\n${JSON.stringify(
                {
                  ios: {
                    associatedDomains: [`applinks:placeholder.expo.app`],
                  },
                },
                null,
                2
              )}`
            );
          } else {
            // Associated domains are found:
            // "applinks:pillarvalley.expo.app",
            // "webcredentials:pillarvalley.expo.app",
            // "activitycontinuation:pillarvalley.expo.app"
            const sanitizedUrls = associatedDomains
              .map((url) => {
                return (
                  url
                    .replace(
                      /^(appclips|applinks|webcredentials|activitycontinuation):/,
                      ""
                    )
                    // Remove trailing slashes
                    .replace(/\/$/, "")
                    // Remove http/https
                    .replace(/^https?:\/\//, "")
                );
              })
              .filter(Boolean);

            const unique = [...new Set(sanitizedUrls)];

            if (unique.length) {
              warnOnce(
                chalk`{gray [${targetDirName}]} Apple App Clip expo-target.config.js missing associated domains entitlements in the target config. Using the following defaults:\n${JSON.stringify(
                  {
                    entitlements: {
                      [associatedDomainsKey]: [
                        `appclips:${unique[0] || "mywebsite.expo.app"}`,
                      ],
                    },
                  },
                  null,
                  2
                )}`
              );

              // Add anyways
              entitlements[associatedDomainsKey] = unique.map(
                (url) => `appclips:${url}`
              );
            }
          }
        }

        // NOTE: This doesn't seem to be required anymore (Oct 12 2024):
        // entitlements["com.apple.developer.on-demand-install-capable"] = true;
      }

      const APP_GROUP_KEY = "com.apple.security.application-groups";
      const hasDefinedAppGroupsManually = APP_GROUP_KEY in entitlements;

      if (
        // If the user hasn't manually defined the app groups array.
        !hasDefinedAppGroupsManually &&
        // And the target is part of a predefined list of types that benefit from app groups that match the main app...
        SHOULD_USE_APP_GROUPS_BY_DEFAULT[props.type]
      ) {
        const mainAppGroups = config.ios?.entitlements?.[APP_GROUP_KEY];

        if (Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
          // Then set the target app groups to match the main app.
          entitlements[APP_GROUP_KEY] = mainAppGroups;
          LOG_QUEUE.add(() => {
            logOnce(
              chalk`[${targetDirName}] Syncing app groups with main app. {dim Define entitlements[${JSON.stringify(
                APP_GROUP_KEY
              )}] in the {bold expo-target.config} file to override.}`
            );
          });
        } else {
          LOG_QUEUE.add(() =>
            warnOnce(
              chalk`{yellow [${targetDirName}]} Apple target may require the App Groups entitlement but none were found in the Expo config.\nExample:\n${JSON.stringify(
                {
                  ios: {
                    entitlements: {
                      [APP_GROUP_KEY]: [
                        `group.${
                          config.ios?.bundleIdentifier ??
                          `com.example.${config.slug}`
                        }`,
                      ],
                    },
                  },
                },
                null,
                2
              )}`
            )
          );
        }
      }

      return entitlements;
    };
    entitlementsJson = applyDefaultEntitlements(entitlementsJson);
  }

  // If the user defined entitlements, then overwrite any existing entitlements file
  if (entitlementsJson) {
    withDangerousMod(config, [
      "ios",
      async (config) => {
        const GENERATED_ENTITLEMENTS_FILE_NAME = "generated.entitlements";
        const entitlementsFilePath =
          entitlementsFiles[0] ??
          // Use the name `generated` to help indicate that this file should be in sync with the config
          path.join(targetDirAbsolutePath, GENERATED_ENTITLEMENTS_FILE_NAME);

        if (entitlementsFiles[0]) {
          const relativeName = path.relative(
            targetDirAbsolutePath,
            entitlementsFiles[0]
          );
          if (relativeName !== GENERATED_ENTITLEMENTS_FILE_NAME) {
            console.log(
              `[${targetDirName}] Replacing ${path.relative(
                targetDirAbsolutePath,
                entitlementsFiles[0]
              )} with entitlements JSON from config`
            );
          }
        }
        fs.writeFileSync(entitlementsFilePath, plist.build(entitlementsJson));
        return config;
      },
    ]);
  } else {
    entitlementsJson = entitlementsFiles[0]
      ? plist.parse(fs.readFileSync(entitlementsFiles[0], "utf8"))
      : undefined;
  }

  // Ensure the entry file exists
  withDangerousMod(config, [
    "ios",
    async (config) => {
      LOG_QUEUE.flush();

      fs.mkdirSync(targetDirAbsolutePath, { recursive: true });

      const files: [string, string][] = [
        ["Info.plist", plist.build(getTargetInfoPlistForType(props.type))],
      ];

      // if (props.type === "widget") {
      //   files.push(
      //     [
      //       "index.swift",
      //       ENTRY_FILE.replace(
      //         "// Export widgets here",
      //         "// Export widgets here\n" + `        ${widget}()`
      //       ),
      //     ],
      //     [widget + ".swift", WIDGET.replace(/alpha/g, widget)],
      //     [widget + ".intentdefinition", INTENT_DEFINITION]
      //   );
      // }

      files.forEach(([filename, content]) => {
        const filePath = path.join(targetDirAbsolutePath, filename);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, content);
        }
      });

      return config;
    },
  ]);

  const mainAppBundleId = config.ios!.bundleIdentifier!;

  const bundleId: string = (() => {
    // Support the bundle identifier being appended to the main app's bundle identifier.
    if (props.bundleIdentifier?.startsWith(".")) {
      return mainAppBundleId + props.bundleIdentifier;
    } else if (props.bundleIdentifier) {
      return props.bundleIdentifier;
    }

    if (props.type === "clip") {
      // Use a more standardized bundle identifier for App Clips.
      return mainAppBundleId + ".clip";
    }

    let bundleId = mainAppBundleId;
    bundleId += ".";

    // Generate the bundle identifier. This logic needs to remain generally stable since it's used for a permanent value.
    // Key here is simplicity and predictability since it's already appended to the main app's bundle identifier.
    return mainAppBundleId + "." + getSanitizedBundleIdentifier(props.type);
  })();

  const deviceFamilies: DeviceFamily[] = config.ios?.isTabletOnly
    ? ["tablet"]
    : config.ios?.supportsTablet
    ? ["phone", "tablet"]
    : ["phone"];

  withXcodeChanges(config, {
    productName,
    configPath: props.configPath,
    name: targetDisplayName,
    displayName: props.displayName,
    cwd:
      "../" +
      path.relative(
        config._internal!.projectRoot,
        path.resolve(props.directory)
      ),
    deploymentTarget: props.deploymentTarget ?? DEFAULT_DEPLOYMENT_TARGET,
    bundleId,
    icon: props.icon,

    orientation: config.orientation,
    hasAccentColor: !!props.colors?.$accent,

    deviceFamilies,

    // @ts-expect-error: who cares
    currentProjectVersion: config.ios?.buildNumber || 1,

    frameworks: getFrameworksForType(props.type).concat(props.frameworks || []),
    type: props.type,
    teamId: props.appleTeamId,

    colors: props.colors,
    exportJs:
      props.exportJs ??
      // Assume App Clips are used for React Native.
      props.type === "clip",
  });

  config = withEASTargets(config, {
    targetName: productName,
    bundleIdentifier: bundleId,
    entitlements: entitlementsJson,
  });

  if (props.images) {
    Object.entries(props.images).forEach(([name, image]) => {
      withImageAsset(config, {
        image,
        name,
        cwd: props.directory,
      });
    });
  }

  withConfigColors(config, props);

  if (props.icon) {
    withIosIcon(config, {
      type: props.type,
      cwd: props.directory,
      // TODO: read from the top-level icon.png file in the folder -- ERR this doesn't allow for URLs
      iconFilePath: props.icon,
      isTransparent: ["action"].includes(props.type),
    });
  }

  return config;
};

const withConfigColors: ConfigPlugin<Pick<Props, "colors" | "directory">> = (
  config,
  props
) => {
  props.colors = props.colors ?? {};
  // const colors: NonNullable<Props["colors"]> = props.colors ?? {};

  // You use the WidgetBackground and `$accent` to style the widget configuration interface of a configurable widget. Apple could have chosen names to make that more obvious.
  // https://useyourloaf.com/blog/widget-background-and-accent-color/
  // i.e. when you press and hold on a widget to configure it, the background color of the widget configuration interface changes to the background color we set here.
  // if (props.widgetBackgroundColor)
  //   colors["$widgetBackground"] = props.widgetBackgroundColor;
  // if (props.accentColor) colors["AccentColor"] = props.accentColor;

  if (props.colors) {
    Object.entries(props.colors).forEach(([name, color]) => {
      withIosColorset(config, {
        cwd: props.directory,
        name,
        color: typeof color === "string" ? color : color.light,
        darkColor: typeof color === "string" ? undefined : color.dark,
      });
    });
  }
  // TODO: Add clean-up maybe? This would possibly restrict the ability to create native colors outside of the Expo target config.

  return config;
};

export default withWidget;
