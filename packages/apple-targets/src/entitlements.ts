import plist from "@expo/plist";
import fs from "fs";
import path from "path";

import { Entitlements } from "./config";
import { TARGET_GENERATED_DIR } from "./target";

/**
 * File name used for entitlements generated from the `entitlements` object in
 * `expo-target.config`. The `generated` prefix signals the file is derived and
 * should not be hand-edited.
 */
export const GENERATED_ENTITLEMENTS_FILE_NAME = "generated.entitlements";

/**
 * Absolute path to the directory that holds a target's generated entitlements,
 * e.g. `<projectRoot>/ios/.targets/<productName>/`.
 */
export function getGeneratedEntitlementsDir(
  projectRoot: string,
  productName: string,
): string {
  return path.join(projectRoot, "ios", TARGET_GENERATED_DIR, productName);
}

/**
 * Absolute path to a target's generated entitlements file, e.g.
 * `<projectRoot>/ios/.targets/<productName>/generated.entitlements`.
 */
export function getGeneratedEntitlementsPath(
  projectRoot: string,
  productName: string,
): string {
  return path.join(
    getGeneratedEntitlementsDir(projectRoot, productName),
    GENERATED_ENTITLEMENTS_FILE_NAME,
  );
}

/**
 * Value for the `CODE_SIGN_ENTITLEMENTS` build setting pointing at a generated
 * entitlements file. The path is resolved by Xcode relative to the `ios/`
 * project root, e.g. `.targets/<productName>/generated.entitlements`.
 */
export function getGeneratedEntitlementsCodeSignPath(
  productName: string,
): string {
  return `${TARGET_GENERATED_DIR}/${productName}/${GENERATED_ENTITLEMENTS_FILE_NAME}`;
}

/**
 * Write a target's entitlements to its generated location, creating parent
 * directories as needed. Returns the absolute path of the written file.
 *
 * This is the single place a generated entitlements file is created — it always
 * writes under `ios/<TARGET_GENERATED_DIR>/` and never into the target's source
 * directory, keeping derived artifacts out of version control.
 */
export function writeGeneratedEntitlements(
  projectRoot: string,
  productName: string,
  entitlements: Entitlements,
): string {
  const dir = getGeneratedEntitlementsDir(projectRoot, productName);
  const file = getGeneratedEntitlementsPath(projectRoot, productName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, plist.build(entitlements));
  return file;
}

/**
 * Classification of a `*.entitlements` file found in a target's source folder
 * when entitlements are instead defined in `expo-target.config`:
 *
 * - `stale-generated`: a `generated.entitlements` file left over from an older
 *   version of this plugin that wrote into the source folder. It is now a
 *   stale, derived artifact and should be deleted.
 * - `handwritten`: any other `*.entitlements` file, authored by the user. It is
 *   left untouched but ignored in favor of the config `entitlements` object.
 */
export type SourceEntitlementsFileKind = "stale-generated" | "handwritten";

export function classifySourceEntitlementsFile(
  filePath: string,
): SourceEntitlementsFileKind {
  return path.basename(filePath) === GENERATED_ENTITLEMENTS_FILE_NAME
    ? "stale-generated"
    : "handwritten";
}

/**
 * Warning shown when a target has BOTH a `generated.entitlements` file in its
 * source folder (written by an older version of this plugin) AND an
 * `entitlements` object in `expo-target.config`. The two are an ambiguous,
 * conflicting source of truth. This is non-fatal — the config object wins and
 * the file is generated under `ios/` — but the user should remove one of the
 * two to resolve the ambiguity.
 *
 * @param entitlementsFileRelativePath project-root-relative path to the source
 *   `generated.entitlements` file, e.g. `targets/clip/generated.entitlements`.
 * @param configRelativePath project-root-relative path to the target config,
 *   e.g. `targets/clip/expo-target.config.js`.
 */
export function getEntitlementsConflictMessage(
  entitlementsFileRelativePath: string,
  configRelativePath: string,
): string {
  return `Ignoring ${entitlementsFileRelativePath} in favor of entitlements object in ${configRelativePath}. Either delete the generated file or remove the entitlements object to continue.`;
}

export interface ResolvedEntitlements {
  /** Absolute path to the entitlements file on disk. */
  absolutePath: string;
  /** `CODE_SIGN_ENTITLEMENTS` value, relative to the `ios/` project root. */
  codeSignEntitlements: string;
}

/**
 * Resolve which entitlements file should drive `CODE_SIGN_ENTITLEMENTS` for a
 * target, with a deterministic precedence:
 *
 * 1. A generated entitlements file under `ios/<TARGET_GENERATED_DIR>/` (written
 *    when the config defines an `entitlements` object) always wins.
 * 2. Otherwise, a hand-written `*.entitlements` file in the target's source
 *    folder is used.
 * 3. If neither exists, returns `null` and the caller removes the setting.
 */
export function resolveEntitlementsForCodeSign({
  projectRoot,
  productName,
  cwd,
}: {
  projectRoot: string;
  productName: string;
  /** The target's source folder relative to `ios/` (i.e. `props.cwd`). */
  cwd: string;
}): ResolvedEntitlements | null {
  const generatedAbsolutePath = getGeneratedEntitlementsPath(
    projectRoot,
    productName,
  );

  if (fs.existsSync(generatedAbsolutePath)) {
    return {
      absolutePath: generatedAbsolutePath,
      codeSignEntitlements: getGeneratedEntitlementsCodeSignPath(productName),
    };
  }

  const sourceCwd = path.join(projectRoot, "ios", cwd);
  const sourceEntitlements = findSourceEntitlementsFiles(sourceCwd);

  if (sourceEntitlements.length > 0) {
    return {
      absolutePath: path.join(sourceCwd, sourceEntitlements[0]),
      codeSignEntitlements: `${cwd}/${sourceEntitlements[0]}`,
    };
  }

  return null;
}

/**
 * List the `*.entitlements` files directly inside a target's source folder,
 * sorted for deterministic ordering. Non-recursive, mirroring the `*.glob` used
 * elsewhere — there should normally be at most one.
 */
function findSourceEntitlementsFiles(sourceCwd: string): string[] {
  if (!fs.existsSync(sourceCwd)) {
    return [];
  }
  return fs
    .readdirSync(sourceCwd)
    .filter((name) => name.endsWith(".entitlements"))
    .sort();
}
