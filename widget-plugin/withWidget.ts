import path from "path";
import { ConfigPlugin } from "@expo/config-plugins";
import {
  withIosAccentColor,
  withIosWidgetBackgroundColor,
} from "./accentColor/withAccentColor";
import { withIosIcon } from "./icon/withIosIcon";
import { withXcodeChanges } from "./withXcodeChanges";
import { withXcodeProjectBetaBaseMod } from "./withXcparse";

type Props = {
  directory?: string;
  name?: string;
  icon?: string;
  accentColor?: { color: string; darkColor?: string } | string;
  backgroundColor?: { color: string; darkColor?: string } | string;
  /** 16.4 */
  deploymentTarget?: string;
};

const withWidget: ConfigPlugin<Props> = (config, props) => {
  // TODO: Magically based on the top-level folders in the `ios-widgets/` folder

  const widget = (props.name ?? path.basename(props.directory))
    .replace(/\/+$/, "")
    .replace(/^\/+/, "");

  withXcodeChanges(config, {
    name: widget,
    cwd:
      "../" +
      path.relative(
        config._internal.projectRoot,
        path.resolve(props.directory)
      ),
    deploymentTarget: props.deploymentTarget ?? "16.4",
    currentProjectVersion: 1,
    bundleId: config.ios.bundleIdentifier! + "." + widget,
  });

  if (props.accentColor) {
    const lightColor =
      typeof props.accentColor === "string"
        ? props.accentColor
        : props.accentColor.color;
    const darkColor =
      typeof props.accentColor === "string"
        ? undefined
        : props.accentColor.darkColor;
    // You use the WidgetBackground and AccentColor to style the widget configuration interface of a configurable widget. Apple could have chosen names to make that more obvious.
    // https://useyourloaf.com/blog/widget-background-and-accent-color/
    // i.e. when you press and hold on a widget to configure it, the background color of the widget configuration interface changes to the background color we set here.
    withIosAccentColor(config, {
      widgetName: widget,
      color: lightColor,
      darkColor: darkColor,
    });
  }

  if (props.backgroundColor) {
    const lightColor =
      typeof props.backgroundColor === "string"
        ? props.backgroundColor
        : props.backgroundColor.color;
    const darkColor =
      typeof props.backgroundColor === "string"
        ? undefined
        : props.backgroundColor.darkColor;
    withIosWidgetBackgroundColor(config, {
      widgetName: widget,
      color: lightColor,
      darkColor: darkColor,
    });
  }

  if (props.icon) {
    withIosIcon(config, {
      widgetName: widget,
      // TODO: read from the top-level icon.png file in the folder -- ERR this doesn't allow for URLs
      iconFilePath: props.icon,
    });
  }

  return withXcodeProjectBetaBaseMod(config);
};

export default withWidget;
