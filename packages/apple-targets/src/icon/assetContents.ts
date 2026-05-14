import { join } from "path";

export type {
  ContentsJson,
  ContentsJsonImageIdiom,
  ContentsJsonImage,
} from "@expo/prebuild-config/build/plugins/icons/AssetContents";

// The package location differs between Expo SDK versions: in newer setups it
// may be nested under @expo/cli's own node_modules rather than at the project
// root.  We try the canonical location first and fall back to the nested one.
// The fallback path assumes this file is at:
//   <project>/node_modules/@bacons/apple-targets/build/icon/
// so four levels up reaches <project>/node_modules/, then into @expo/cli.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _assetContents = (() => {
  const pkg = "@expo/prebuild-config/build/plugins/icons/AssetContents";
  try {
    return require(pkg);
  } catch (_primaryError) {
    const fallbackPath = join(
      __dirname,
      "../../../../@expo/cli/node_modules/@expo/prebuild-config/build/plugins/icons/AssetContents.js",
    );
    try {
      return require(fallbackPath);
    } catch (_fallbackError) {
      throw new Error(
        `Could not load AssetContents from either "${pkg}" or the fallback path "${fallbackPath}". ` +
          `Ensure @expo/prebuild-config is installed.`,
      );
    }
  }
})() as typeof import("@expo/prebuild-config/build/plugins/icons/AssetContents");

export const { writeContentsJsonAsync } = _assetContents;
