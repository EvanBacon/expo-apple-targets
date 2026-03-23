import { ConfigPlugin, withDangerousMod } from "expo/config-plugins";
import fs from "node:fs";
import path from "node:path";

/**
 * Check if SVG content is an SF Symbol template by looking for the
 * characteristic `<g id="Symbols">` group that all SF Symbol templates contain.
 */
export function isSFSymbolContent(content: string): boolean {
  // SF Symbol templates always have a <g id="Symbols"> group containing
  // weight/size variant groups like "Regular-S", "Regular-M", "Regular-L".
  return /\bid="Symbols"/.test(content) && /\bid="Regular-S"/.test(content);
}

export const withIosSymbolset: ConfigPlugin<{
  cwd: string;
  name: string;
  svgContent: string;
  svgFilename: string;
}> = (config, { cwd, name, svgContent, svgFilename }) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const symbolsetDir = path.join(
        projectRoot,
        cwd,
        `Assets.xcassets/${name}.symbolset`
      );

      await fs.promises.mkdir(symbolsetDir, { recursive: true });

      await fs.promises.writeFile(
        path.join(symbolsetDir, svgFilename),
        svgContent
      );

      await fs.promises.writeFile(
        path.join(symbolsetDir, "Contents.json"),
        JSON.stringify(
          {
            info: {
              author: "expo",
              version: 1,
            },
            symbols: [
              {
                filename: svgFilename,
                idiom: "universal",
              },
            ],
          },
          null,
          2
        )
      );

      return config;
    },
  ]);
};
