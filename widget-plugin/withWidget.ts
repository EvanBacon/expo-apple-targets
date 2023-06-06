import path from "path";
import { ConfigPlugin } from "@expo/config-plugins";
import {
  withIosAccentColor,
  withIosWidgetBackgroundColor,
} from "./accentColor/withAccentColor";
import { withIosIcon } from "./icon/withIosIcon";
import { withXcodeChanges } from "./withXcodeChanges";
import { withXcodeProjectBetaBaseMod } from "./withXcparse";

const withWidget: ConfigPlugin = (config) => {
  // TODO: Magically based on the top-level folders in the `ios-widgets/` folder

  const widget = "alpha";

  withXcodeChanges(config, {
    name: widget,
    cwd: "../" + widget,
    deploymentTarget: "16.4",
    currentProjectVersion: 1,
    bundleId: config.ios.bundleIdentifier! + "." + widget,
  });

  // You use the WidgetBackground and AccentColor to style the widget configuration interface of a configurable widget. Apple could have chosen names to make that more obvious.
  // https://useyourloaf.com/blog/widget-background-and-accent-color/
  // i.e. when you press and hold on a widget to configure it, the background color of the widget configuration interface changes to the background color we set here.
  withIosAccentColor(config, {
    widgetName: widget,
    color: "violet",
    darkColor: "#4630eb",
  });

  withIosWidgetBackgroundColor(config, {
    widgetName: widget,
    color: "#E8EAED",
    darkColor: "#282A36",
  });
  withIosIcon(config, {
    widgetName: widget,
    // TODO: read from the top-level icon.png file in the folder -- ERR this doesn't allow for URLs
    iconFilePath: path.join(__dirname, "../assets/icon-bear.png"), // "https://icogen-baconbrix.vercel.app/api/icon",
  });
  withXcodeProjectBetaBaseMod(config);
  return config;
};

export default withWidget;
