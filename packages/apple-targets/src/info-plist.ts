import plist from "@expo/plist";
import fs from "fs";
import path from "path";

import { TARGET_GENERATED_DIR } from "./target";

/**
 * File name used for Info.plist generated from the `infoPlist` object in
 * `expo-target.config`. Lives under `ios/.targets/<productName>/` so the
 * location (not a filename prefix) signals that the file is derived and should
 * not be hand-edited.
 */
export const GENERATED_INFO_PLIST_FILE_NAME = "Info.plist";

/**
 * Absolute path to the directory that holds a target's generated Info.plist,
 * e.g. `<projectRoot>/ios/.targets/<productName>/`.
 */
export function getGeneratedInfoPlistDir(
  projectRoot: string,
  productName: string,
): string {
  return path.join(projectRoot, "ios", TARGET_GENERATED_DIR, productName);
}

/**
 * Absolute path to a target's generated Info.plist file, e.g.
 * `<projectRoot>/ios/.targets/<productName>/Info.plist`.
 */
export function getGeneratedInfoPlistPath(
  projectRoot: string,
  productName: string,
): string {
  return path.join(
    getGeneratedInfoPlistDir(projectRoot, productName),
    GENERATED_INFO_PLIST_FILE_NAME,
  );
}

/**
 * Value for the `INFOPLIST_FILE` build setting pointing at a generated
 * Info.plist. The path is resolved by Xcode relative to the `ios/` project
 * root, e.g. `.targets/<productName>/Info.plist`.
 */
export function getGeneratedInfoPlistBuildSettingPath(
  productName: string,
): string {
  return `${TARGET_GENERATED_DIR}/${productName}/${GENERATED_INFO_PLIST_FILE_NAME}`;
}

/**
 * Write a target's Info.plist to its generated location, creating parent
 * directories as needed. Returns the absolute path of the written file.
 *
 * This is the single place a generated Info.plist is created — it always
 * writes under `ios/<TARGET_GENERATED_DIR>/` and never into the target's source
 * directory, keeping derived artifacts out of version control.
 */
export function writeGeneratedInfoPlist(
  projectRoot: string,
  productName: string,
  contents: Record<string, unknown>,
): string {
  const dir = getGeneratedInfoPlistDir(projectRoot, productName);
  const file = getGeneratedInfoPlistPath(projectRoot, productName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, plist.build(contents));
  return file;
}

export interface ResolvedInfoPlist {
  /** Absolute path to the Info.plist file on disk. */
  absolutePath: string;
  /** `INFOPLIST_FILE` value, relative to the `ios/` project root. */
  infoPlistFile: string;
}

/**
 * Resolve which Info.plist file should drive `INFOPLIST_FILE` for a target,
 * with a deterministic precedence:
 *
 * 1. A generated Info.plist under `ios/<TARGET_GENERATED_DIR>/` (written when
 *    the config defines an `infoPlist` object) always wins.
 * 2. Otherwise, the hand-written `Info.plist` in the target's source folder
 *    is used (the default path used by configuration lists).
 * 3. If neither exists, returns `null` and the caller leaves the default.
 */
export function resolveInfoPlistForBuild({
  projectRoot,
  productName,
  cwd,
}: {
  projectRoot: string;
  productName: string;
  /** The target's source folder relative to `ios/` (i.e. `props.cwd`). */
  cwd: string;
}): ResolvedInfoPlist | null {
  const generatedAbsolutePath = getGeneratedInfoPlistPath(
    projectRoot,
    productName,
  );

  if (fs.existsSync(generatedAbsolutePath)) {
    return {
      absolutePath: generatedAbsolutePath,
      infoPlistFile: getGeneratedInfoPlistBuildSettingPath(productName),
    };
  }

  const sourceCwd = path.join(projectRoot, "ios", cwd);
  const sourceInfoPlist = path.join(sourceCwd, "Info.plist");

  if (fs.existsSync(sourceInfoPlist)) {
    return {
      absolutePath: sourceInfoPlist,
      infoPlistFile: `${cwd}/Info.plist`,
    };
  }

  return null;
}

/**
 * Merge user-provided `infoPlist` keys into a base Info.plist object.
 * Existing keys from the base are overwritten; unknown keys are preserved.
 */
export function mergeInfoPlist(
  base: Record<string, unknown>,
  infoPlist: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...infoPlist };
}
