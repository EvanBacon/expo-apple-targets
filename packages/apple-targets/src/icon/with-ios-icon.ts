import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import { generateImageAsync } from "@expo/image-utils";
import {
  ContentsJson,
  ContentsJsonImageIdiom,
  writeContentsJsonAsync,
} from "@expo/prebuild-config/build/plugins/icons/AssetContents";
import * as fs from "fs";
import { join } from "path";

import { ExtensionType } from "../target";

// TODO: support dark, tinted, and universal icons for widgets.
export const withIosIcon: ConfigPlugin<{
  cwd: string;
  type: ExtensionType;
  iconFilePath: string;
  isTransparent?: boolean;
}> = (config, { cwd, type, iconFilePath, isTransparent = false }) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const namedProjectRoot = join(projectRoot, cwd);
      if (type === "watch") {
        // Ensure the Images.xcassets/AppIcon.appiconset path exists
        await fs.promises.mkdir(join(namedProjectRoot, IMAGESET_PATH), {
          recursive: true,
        });

        // Finally, write the Config.json
        await writeContentsJsonAsync(join(namedProjectRoot, IMAGESET_PATH), {
          images: await generateWatchIconsInternalAsync(
            iconFilePath,
            projectRoot,
            namedProjectRoot,
            cwd,
            isTransparent
          ),
        });
      } else {
        await setIconsAsync(
          iconFilePath,
          projectRoot,
          join(projectRoot, cwd),
          cwd,
          isTransparent
        );
      }
      return config;
    },
  ]);
};

const IMAGE_CACHE_NAME = "widget-icons-";
const IMAGESET_PATH = "Assets.xcassets/AppIcon.appiconset";

// Hard-coding seemed like the clearest and safest way to implement the sizes.
export const ICON_CONTENTS: {
  idiom: ContentsJsonImageIdiom;
  sizes: { size: number; scales: (1 | 2 | 3)[] }[];
}[] = [
  {
    idiom: "iphone",
    sizes: [
      {
        size: 20,
        scales: [2, 3],
      },
      {
        size: 29,
        scales: [1, 2, 3],
      },
      {
        size: 40,
        scales: [2, 3],
      },
      {
        size: 60,
        scales: [2, 3],
      },
      // TODO: 76x76@2x seems unused now
      // {
      //   size: 76,
      //   scales: [2],
      // },
    ],
  },
  {
    idiom: "ipad",
    sizes: [
      {
        size: 20,
        scales: [1, 2],
      },
      {
        size: 29,
        scales: [1, 2],
      },
      {
        size: 40,
        scales: [1, 2],
      },
      {
        size: 76,
        scales: [1, 2],
      },
      {
        size: 83.5,
        scales: [2],
      },
    ],
  },
  {
    idiom: "ios-marketing",
    sizes: [
      {
        size: 1024,
        scales: [1],
      },
    ],
  },
];

export async function setIconsAsync(
  icon: string,
  projectRoot: string,
  iosNamedProjectRoot: string,
  cacheComponent: string,
  isTransparent: boolean
) {
  // Ensure the Images.xcassets/AppIcon.appiconset path exists
  await fs.promises.mkdir(join(iosNamedProjectRoot, IMAGESET_PATH), {
    recursive: true,
  });

  // Finally, write the Config.json
  await writeContentsJsonAsync(join(iosNamedProjectRoot, IMAGESET_PATH), {
    images: await generateIconsInternalAsync(
      icon,
      projectRoot,
      iosNamedProjectRoot,
      cacheComponent,
      isTransparent
    ),
  });
}

export async function generateIconsInternalAsync(
  icon: string,
  projectRoot: string,
  iosNamedProjectRoot: string,
  cacheComponent: string,
  isTransparent: boolean
) {
  // Store the image JSON data for assigning via the Contents.json
  const imagesJson: ContentsJson["images"] = [];

  // keep track of icons that have been generated so we can reuse them in the Contents.json
  const generatedIcons: Record<string, boolean> = {};

  for (const platform of ICON_CONTENTS) {
    const isMarketing = platform.idiom === "ios-marketing";
    for (const { size, scales } of platform.sizes) {
      for (const scale of scales) {
        // The marketing icon is special because it makes no sense.
        const filename = isMarketing
          ? "ItunesArtwork@2x.png"
          : getAppleIconName(size, scale);
        // Only create an image that hasn't already been generated.
        if (!(filename in generatedIcons)) {
          const iconSizePx = size * scale;

          // Using this method will cache the images in `.expo` based on the properties used to generate them.
          // this method also supports remote URLs and using the global sharp instance.
          const { source } = await generateImageAsync(
            { projectRoot, cacheType: IMAGE_CACHE_NAME + cacheComponent },
            {
              src: icon,
              name: filename,
              width: iconSizePx,
              height: iconSizePx,
              removeTransparency: !isTransparent,
              // The icon should be square, but if it's not then it will be cropped.
              resizeMode: "cover",
              // Force the background color to solid white to prevent any transparency.
              // TODO: Maybe use a more adaptive option based on the icon color?
              backgroundColor: isTransparent ? "#ffffff00" : "#ffffff",
            }
          );
          // Write image buffer to the file system.
          const assetPath = join(iosNamedProjectRoot, IMAGESET_PATH, filename);
          await fs.promises.writeFile(assetPath, source);
          // Save a reference to the generated image so we don't create a duplicate.
          generatedIcons[filename] = true;
        }

        imagesJson.push({
          idiom: platform.idiom,
          size: `${size}x${size}`,
          // @ts-ignore: template types not supported in TS yet
          scale: `${scale}x`,
          filename,
        });
      }
    }
  }

  return imagesJson;
}

export async function generateWatchIconsInternalAsync(
  icon: string,
  projectRoot: string,
  iosNamedProjectRoot: string,
  cacheComponent: string,
  isTransparent: boolean
) {
  // Store the image JSON data for assigning via the Contents.json
  const imagesJson: ContentsJson["images"] = [];

  const size = 1024;
  const filename = getAppleIconName(size, 1);
  // Using this method will cache the images in `.expo` based on the properties used to generate them.
  // this method also supports remote URLs and using the global sharp instance.
  const { source } = await generateImageAsync(
    { projectRoot, cacheType: IMAGE_CACHE_NAME + cacheComponent },
    {
      src: icon,
      name: filename,
      width: size,
      height: size,
      removeTransparency: !isTransparent,
      // The icon should be square, but if it's not then it will be cropped.
      resizeMode: "cover",
      // Force the background color to solid white to prevent any transparency.
      // TODO: Maybe use a more adaptive option based on the icon color?
      backgroundColor: isTransparent ? "#ffffff00" : "#ffffff",
    }
  );
  // Write image buffer to the file system.
  const assetPath = join(iosNamedProjectRoot, IMAGESET_PATH, filename);
  await fs.promises.writeFile(assetPath, source);

  imagesJson.push({
    filename: getAppleIconName(size, 1),
    idiom: "universal",
    size: `${size}x${size}`,
    platform: "watchos",
  });

  return imagesJson;
}

function getAppleIconName(size: number, scale: number): string {
  return `App-Icon-${size}x${size}@${scale}x.png`;
}
