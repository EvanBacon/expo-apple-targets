import plist from "@expo/plist";
import fs from "fs";
import path from "path";

import { TARGET_GENERATED_DIR } from "./target";

/**
 * File name used for Info.plist generated from the `infoPlist` object in
 * `expo-target.config`. Lives under `ios/.targets/<targetDirName>/` so the
 * location (not a filename prefix) signals that the file is derived and should
 * not be hand-edited.
 */
export const GENERATED_INFO_PLIST_FILE_NAME = "Info.plist";

/**
 * Absolute path to the directory that holds a target's generated Info.plist,
 * e.g. `<projectRoot>/ios/.targets/<targetDirName>/`.
 *
 * The folder name is the target's source directory basename (e.g. `widget` for
 * `targets/widget/`), not the config `name` / Xcode product name — so it stays
 * filesystem-safe and mirrors the source layout.
 */
export function getGeneratedInfoPlistDir(
  projectRoot: string,
  targetDirName: string,
): string {
  return path.join(projectRoot, "ios", TARGET_GENERATED_DIR, targetDirName);
}

/**
 * Absolute path to a target's generated Info.plist file, e.g.
 * `<projectRoot>/ios/.targets/<targetDirName>/Info.plist`.
 */
export function getGeneratedInfoPlistPath(
  projectRoot: string,
  targetDirName: string,
): string {
  return path.join(
    getGeneratedInfoPlistDir(projectRoot, targetDirName),
    GENERATED_INFO_PLIST_FILE_NAME,
  );
}

/**
 * Value for the `INFOPLIST_FILE` build setting pointing at a generated
 * Info.plist. The path is resolved by Xcode relative to the `ios/` project
 * root, e.g. `.targets/<targetDirName>/Info.plist`.
 */
export function getGeneratedInfoPlistBuildSettingPath(
  targetDirName: string,
): string {
  return `${TARGET_GENERATED_DIR}/${targetDirName}/${GENERATED_INFO_PLIST_FILE_NAME}`;
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
  targetDirName: string,
  contents: Record<string, unknown>,
): string {
  const dir = getGeneratedInfoPlistDir(projectRoot, targetDirName);
  const file = getGeneratedInfoPlistPath(projectRoot, targetDirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, plist.build(contents));
  return file;
}

/**
 * Warning shown when a target has BOTH a source `Info.plist` and an
 * `infoPlist` object in `expo-target.config`. The two are an ambiguous dual
 * source of truth: keys are merged (config overwrites) into the generated
 * file under `ios/`, but the user should pick one approach.
 *
 * @param infoPlistFileRelativePath project-root-relative path to the source
 *   `Info.plist`, e.g. `targets/widget/Info.plist`.
 * @param configRelativePath project-root-relative path to the target config,
 *   e.g. `targets/widget/expo-target.config.js`.
 */
export function getInfoPlistConflictMessage(
  infoPlistFileRelativePath: string,
  configRelativePath: string,
): string {
  return `Found both ${infoPlistFileRelativePath} and an infoPlist object in ${configRelativePath}. Keys are merged (config overwrites source) into the generated Info.plist under ios/.targets/. Either delete the source Info.plist to use only the config, or remove the infoPlist object to hand-manage the file.`;
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
 *
 * The generated folder is keyed by the target directory name (basename of
 * `cwd`), e.g. `widget` for `../targets/widget`.
 */
export function resolveInfoPlistForBuild({
  projectRoot,
  cwd,
}: {
  projectRoot: string;
  /** The target's source folder relative to `ios/` (i.e. `props.cwd`). */
  cwd: string;
}): ResolvedInfoPlist | null {
  const targetDirName = path.basename(cwd);
  const generatedAbsolutePath = getGeneratedInfoPlistPath(
    projectRoot,
    targetDirName,
  );

  if (fs.existsSync(generatedAbsolutePath)) {
    return {
      absolutePath: generatedAbsolutePath,
      infoPlistFile: getGeneratedInfoPlistBuildSettingPath(targetDirName),
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
