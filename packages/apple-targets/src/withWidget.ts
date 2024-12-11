import {
  ConfigPlugin,
  withDangerousMod,
  WarningAggregator,
} from "@expo/config-plugins";
import plist from "@expo/plist";
import fs from "fs";
import { sync as globSync } from "glob";
import path from "path";
import chalk from "chalk";

import { withIosColorset } from "./colorset/withIosColorset";
import { Config, Entitlements } from "./config";
import { withImageAsset } from "./icon/withImageAsset";
import { withIosIcon } from "./icon/withIosIcon";
import {
  getFrameworksForType,
  getTargetInfoPlistForType,
  SHOULD_USE_APP_GROUPS_BY_DEFAULT,
} from "./target";
import { withEASTargets } from "./withEasCredentials";
import { withXcodeChanges } from "./withXcodeChanges";

type Props = Config & {
  directory: string;
  configPath: string;
};

const DEFAULT_DEPLOYMENT_TARGET = "18.1";

function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, any>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

const warnOnce = memoize(console.warn);
const logOnce = memoize(console.log);

function createLogQueue(): { add: (fn: Function) => void; flush: () => void } {
  const queue: Function[] = [];

  const flush = () => {
    queue.forEach((fn) => fn());
    queue.length = 0;
  };

  return {
    flush,
    add: (fn: Function) => {
      queue.push(fn);
    },
  };
}

// Queue up logs so they only run when prebuild is actually running and not during standard config reads.
const prebuildLogQueue = createLogQueue();

function kebabToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
}
const withWidget: ConfigPlugin<Props> = (config, props) => {
  prebuildLogQueue.add(() =>
    warnOnce(
      chalk`\nUsing experimental Config Plugin {bold @bacons/apple-targets} that is subject to breaking changes.`
    )
  );

  // TODO: Magically based on the top-level folders in the `ios-widgets/` folder

  if (props.icon && !/https?:\/\//.test(props.icon)) {
    props.icon = path.join(props.directory, props.icon);
  }

  const widgetDir = path
    .basename(props.directory)
    .replace(/\/+$/, "")
    .replace(/^\/+/, "");

  const widget = kebabToCamelCase(widgetDir);

  const widgetFolderAbsolutePath = path.join(
    config._internal?.projectRoot ?? "",
    props.directory
  );

  const entitlementsFiles = globSync("*.entitlements", {
    absolute: true,
    cwd: widgetFolderAbsolutePath,
  });

  if (entitlementsFiles.length > 1) {
    throw new Error(
      `[bacons/apple-targets][${props.type}] Found more than one '*.entitlements' file in ${widgetFolderAbsolutePath}`
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
          prebuildLogQueue.add(() => {
            logOnce(
              chalk`[${widget}] Syncing app groups with main app. {dim Define entitlements[${JSON.stringify(
                APP_GROUP_KEY
              )}] in the {bold expo-target.config} file to override.}`
            );
          });
        } else {
          prebuildLogQueue.add(() =>
            console.warn(
              chalk`{yellow [${widget}]} Apple target may require the App Groups entitlement but none were found in the Expo config.\nExample:\n${JSON.stringify(
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
          path.join(widgetFolderAbsolutePath, GENERATED_ENTITLEMENTS_FILE_NAME);

        if (entitlementsFiles[0]) {
          const relativeName = path.relative(
            widgetFolderAbsolutePath,
            entitlementsFiles[0]
          );
          if (relativeName !== GENERATED_ENTITLEMENTS_FILE_NAME) {
            console.log(
              `[${widget}] Replacing ${path.relative(
                widgetFolderAbsolutePath,
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
      prebuildLogQueue.flush();

      fs.mkdirSync(widgetFolderAbsolutePath, { recursive: true });

      const files: [string, string][] = [
        ["Info.plist", getTargetInfoPlistForType(props.type)],
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
        const filePath = path.join(widgetFolderAbsolutePath, filename);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, content);
        }
      });

      return config;
    },
  ]);

  const targetName = props.name ?? widget;
  const mainAppBundleId = config.ios!.bundleIdentifier!;
  const bundleId = props.bundleIdentifier?.startsWith(".")
    ? mainAppBundleId + props.bundleIdentifier
    : props.bundleIdentifier ?? `${mainAppBundleId}.${targetName}`;

  withXcodeChanges(config, {
    configPath: props.configPath,
    name: targetName,
    cwd:
      "../" +
      path.relative(
        config._internal!.projectRoot,
        path.resolve(props.directory)
      ),
    deploymentTarget: props.deploymentTarget ?? DEFAULT_DEPLOYMENT_TARGET,
    bundleId,
    icon: props.icon,

    hasAccentColor: !!props.colors?.$accent,

    // @ts-expect-error: who cares
    currentProjectVersion: config.ios?.buildNumber || 1,

    frameworks: getFrameworksForType(props.type).concat(props.frameworks || []),
    type: props.type,
    teamId: props.appleTeamId,

    exportJs:
      props.exportJs ??
      // Assume App Clips are used for React Native.
      props.type === "clip",
  });

  config = withEASTargets(config, {
    targetName,
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
