import { ExtensionType } from "./target";

export type DynamicColor = { color: string; darkColor?: string };

export type Config = {
  /**
   * The type of extension to generate.
   * @example "widget"
   */
  type: ExtensionType;
  /** Name of the target. Will default to a sanitized version of the directory name. */
  name?: string;
  /**
   * A local file path or URL to an image asset.
   * @example "./assets/icon.png"
   * @example "https://example.com/icon.png"
   */
  icon?: string;
  /**
   * Optional color to generate an accent color xcasset for the target.
   *
   * @example "#FF0000"
   * @example { color: "#FF0000", darkColor: "#00FF00" }
   */
  accentColor?: string | DynamicColor;

  /**
   * Optional color to generate a widget background color xcasset for the target.
   *
   * @example "#FF0000"
   * @example { color: "#FF0000", darkColor: "#00FF00" }
   */
  widgetBackgroundColor?: string | DynamicColor;
  /**
   * A list of additional frameworks to add to the target.
   * @example ["UserNotifications", "Intents"]
   */
  frameworks?: string[];

  /** Deployment iOS version for the target. Defaults to `16.4` */
  deploymentTarget?: string;

  /** Apple team ID to use for signing the target. Defaults to whatever is used in the main App target. */
  appleTeamId?: string;
};
