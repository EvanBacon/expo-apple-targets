import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import { generateImageAsync } from "@expo/image-utils";
import {
  ContentsJson,
  ContentsJsonImage,
  writeContentsJsonAsync,
} from "@expo/prebuild-config/build/plugins/icons/AssetContents";
import * as fs from "fs";
import path, { join } from "path";

import { ExtensionType } from "../target";

export type IconConfig =
  | string
  | { light?: string; dark?: string; tinted?: string };

export const withIosIcon: ConfigPlugin<{
  cwd: string;
  type: ExtensionType;
  icon: IconConfig;
  isTransparent?: boolean;
}> = (config, { cwd, type, icon, isTransparent = false }) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const namedProjectRoot = join(projectRoot, cwd);

      // Check if this is a liquid glass .icon folder
      const iconPath = typeof icon === "string" ? icon : icon.light;
      if (iconPath && path.extname(iconPath) === ".icon") {
        await addLiquidGlassIcon(iconPath, projectRoot, namedProjectRoot);
        return config;
      }

      // Ensure the Assets.xcassets/AppIcon.appiconset path exists
      await fs.promises.mkdir(join(namedProjectRoot, IMAGESET_PATH), {
        recursive: true,
      });

      const imagesJson: ContentsJson["images"] = [];
      const platform = type === "watch" ? "watchos" : "ios";

      // Get the base icon path
      const baseIconPath =
        typeof icon === "object"
          ? icon.light || icon.dark || icon.tinted
          : icon;

      if (baseIconPath) {
        // Generate the base/light icon
        const baseIcon = await generateUniversalIconAsync(projectRoot, {
          icon: baseIconPath,
          cacheKey: cwd + "-universal-icon",
          iosNamedProjectRoot: namedProjectRoot,
          platform,
          isTransparent,
        });
        imagesJson.push(baseIcon);
      }

      // Handle dark and tinted variants (only for object icon config)
      if (typeof icon === "object") {
        if (icon.dark) {
          const darkIcon = await generateUniversalIconAsync(projectRoot, {
            icon: icon.dark,
            cacheKey: cwd + "-universal-icon-dark",
            iosNamedProjectRoot: namedProjectRoot,
            platform,
            appearance: "dark",
            // Dark icons should preserve transparency
            isTransparent: true,
          });
          imagesJson.push(darkIcon);
        }

        if (icon.tinted) {
          const tintedIcon = await generateUniversalIconAsync(projectRoot, {
            icon: icon.tinted,
            cacheKey: cwd + "-universal-icon-tinted",
            iosNamedProjectRoot: namedProjectRoot,
            platform,
            appearance: "tinted",
            isTransparent,
          });
          imagesJson.push(tintedIcon);
        }
      }

      // Write the Contents.json
      await writeContentsJsonAsync(join(namedProjectRoot, IMAGESET_PATH), {
        images: imagesJson,
      });

      return config;
    },
  ]);
};

const IMAGE_CACHE_NAME = "widget-icons-";
const IMAGESET_PATH = "Assets.xcassets/AppIcon.appiconset";

function getAppleIconName(
  size: number,
  scale: number,
  appearance?: "dark" | "tinted"
): string {
  let name = "App-Icon";
  if (appearance) {
    name = `${name}-${appearance}`;
  }
  name = `${name}-${size}x${size}@${scale}x.png`;
  return name;
}

export async function generateUniversalIconAsync(
  projectRoot: string,
  {
    icon,
    cacheKey,
    iosNamedProjectRoot,
    platform,
    appearance,
    isTransparent = false,
  }: {
    platform: "watchos" | "ios";
    icon: string;
    appearance?: "dark" | "tinted";
    iosNamedProjectRoot: string;
    cacheKey: string;
    isTransparent?: boolean;
  }
): Promise<ContentsJsonImage> {
  const size = 1024;
  const filename = getAppleIconName(size, 1, appearance);

  // Using this method will cache the images in `.expo` based on the properties used to generate them.
  // This method also supports remote URLs and using the global sharp instance.
  const { source } = await generateImageAsync(
    { projectRoot, cacheType: IMAGE_CACHE_NAME + cacheKey },
    {
      src: icon,
      name: filename,
      width: size,
      height: size,
      // Transparency needs to be preserved in dark variant, but can safely be removed in "light" and "tinted" variants.
      removeTransparency: !isTransparent && appearance !== "dark",
      // The icon should be square, but if it's not then it will be cropped.
      resizeMode: "cover",
      // Force the background color to solid white to prevent any transparency (for "any" and "tinted" variants).
      // Dark variants should not have a background color to preserve transparency.
      backgroundColor:
        appearance === "dark"
          ? undefined
          : isTransparent
          ? "#ffffff00"
          : "#ffffff",
    }
  );

  // Write image buffer to the file system.
  const assetPath = join(iosNamedProjectRoot, IMAGESET_PATH, filename);
  await fs.promises.writeFile(assetPath, source);

  return {
    filename,
    idiom: "universal",
    platform,
    size: `${size}x${size}`,
    ...(appearance
      ? { appearances: [{ appearance: "luminosity", value: appearance }] }
      : {}),
  };
}

async function addLiquidGlassIcon(
  iconPath: string,
  projectRoot: string,
  iosNamedProjectRoot: string
): Promise<void> {
  const iconName = path.basename(iconPath, ".icon");
  const sourceIconPath = path.join(projectRoot, iconPath);
  const targetIconPath = path.join(iosNamedProjectRoot, `${iconName}.icon`);

  if (!fs.existsSync(sourceIconPath)) {
    console.warn(
      `[withIosIcon] Liquid glass icon file not found at path: ${iconPath}`
    );
    return;
  }

  await fs.promises.cp(sourceIconPath, targetIconPath, { recursive: true });
}
