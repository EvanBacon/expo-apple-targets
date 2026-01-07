import { ConfigPlugin, withDangerousMod } from "expo/config-plugins";
import { type ContentsJsonImageIdiom } from "@expo/prebuild-config/build/plugins/icons/AssetContents";
import fs from "node:fs";
import path from "node:path";

import { customColorFromCSS } from "./custom-color-from-css";

type Appearance = {
  appearance: string;
  value: string;
};

type Color = {
  "color-space": // Default for Apple devices.
  | "display-p3"
    // Standard RGB like the web uses.
    | "srgb"
    | "extended-linear-srgb"
    | "extended-srgb"
    // Gray-scale
    | "gray-gamma-22"
    | "extended-gray";
  components: {
    // Can be a float between 0 and 1, or an integer between 0 and 255, or hex strings `"0xFF"`
    alpha: number;
    blue: number;
    green: number;
    red: number;
  };
};

export const withIosColorset: ConfigPlugin<{
  cwd: string;
  name: string;
  color: string;
  darkColor?: string;
}> = (config, { cwd, color, darkColor, name }) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      await setColorAsync(
        { color, darkColor },
        path.join(
          config.modRequest.projectRoot,
          cwd,
          `Assets.xcassets/${name}.colorset`
        )
      );
      return config;
    },
  ]);
};

const DARK_APPEARANCE: Appearance = {
  appearance: "luminosity",
  value: "dark",
};

function createColor(color: string): Color {
  return {
    "color-space": "display-p3",
    components: customColorFromCSS(color),
  };
}

export async function setColorAsync(
  { color, darkColor }: { color: string; darkColor?: string },
  colorsetFilePath: string
) {
  // Ensure the Images.xcassets/AppIcon.appiconset path exists
  await fs.promises.mkdir(colorsetFilePath, { recursive: true });

  // Store the image JSON data for assigning via the Contents.json
  const colorsJson: {
    appearances?: Appearance[];
    color: Color;
    idiom: ContentsJsonImageIdiom;

    // Used as a hint for when a colorset supports multiple color spaces
    "display-gamut"?: "sRGB" | "display-P3";
  }[] = [];

  if (color) {
    colorsJson.push({
      color: createColor(color),
      idiom: "universal",
    });
  }
  if (darkColor) {
    colorsJson.push({
      appearances: [DARK_APPEARANCE],
      color: createColor(darkColor),
      idiom: "universal",
    });
  }

  // Finally, write the Config.json
  await writeContentsJsonAsync(colorsetFilePath, {
    colors: colorsJson,
  });
}

async function writeContentsJsonAsync(
  directory: string,
  { colors }: { colors: any[] }
) {
  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(
    path.join(directory, "Contents.json"),
    JSON.stringify(
      {
        colors,
        info: {
          version: 1,
          // common practice is for the tool that generated the icons to be the "author"
          author: "expo",
        },
      },
      null,
      2
    )
  );
}
