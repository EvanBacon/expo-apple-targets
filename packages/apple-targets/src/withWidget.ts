import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import plist from "@expo/plist";
import fs from "fs";
import { sync as globSync } from "glob";
import path from "path";

import { withIosColorset } from "./colorset/withIosColorset";
import { Config, Entitlements } from "./config";
import { withImageAsset } from "./icon/withImageAsset";
import { withIosIcon } from "./icon/withIosIcon";
import { getFrameworksForType, getTargetInfoPlistForType } from "./target";
import { withEASTargets } from "./withEasCredentials";
import { withXcodeChanges } from "./withXcodeChanges";

type Props = Config & {
  directory: string;
};
let hasWarned = false;

function kebabToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
}
const withWidget: ConfigPlugin<Props> = (config, props) => {
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
      `Found multiple entitlements files in ${widgetFolderAbsolutePath}`
    );
  }

  let entitlementsJson: undefined | Entitlements = props.entitlements;

  // If the user defined entitlements, then overwrite any existing entitlements file
  if (props.entitlements) {
    withDangerousMod(config, [
      "ios",
      async (config) => {
        const entitlementsFilePath =
          entitlementsFiles[0] ??
          // Use the name `generated` to help indicate that this file should be in sync with the config
          path.join(widgetFolderAbsolutePath, `generated.entitlements`);

        if (entitlementsFiles[0]) {
          console.log(
            `[${widget}] Replacing ${path.relative(
              widgetFolderAbsolutePath,
              entitlementsFiles[0]
            )} with entitlements JSON from config`
          );
        }
        fs.writeFileSync(
          entitlementsFilePath,
          plist.build(props.entitlements as any)
        );
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
      if (!hasWarned) {
        hasWarned = true;
        console.warn(
          "You're using an experimental Config Plugin that is subject to breaking changes and has no E2E tests."
        );
      }

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
    name: targetName,
    cwd:
      "../" +
      path.relative(
        config._internal!.projectRoot,
        path.resolve(props.directory)
      ),
    deploymentTarget: props.deploymentTarget ?? "16.4",
    bundleId,
    icon: props.icon,

    hasAccentColor: !!props.colors?.$accent,

    // @ts-expect-error: who cares
    currentProjectVersion: config.ios?.buildNumber || 1,

    frameworks: getFrameworksForType(props.type).concat(props.frameworks || []),
    type: props.type,
    teamId: props.appleTeamId,
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

  return config;
};

export default withWidget;
