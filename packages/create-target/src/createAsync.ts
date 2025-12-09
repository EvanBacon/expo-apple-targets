#!/usr/bin/env node
import chalk from "chalk";
import fs from "fs";
import path from "path";
import plist from "@expo/plist";

import { normalizeStaticPlugin } from "@expo/config-plugins/build/utils/plugin-resolver";
import { ExpoConfig, getConfig, modifyConfigAsync } from "@expo/config";
import resolveFrom from "resolve-from";
import { copy, remove } from "fs-extra";
import {
  assertValidTarget,
  confirmAsync,
  promptTargetAsync,
} from "./promptTarget";
import { env } from "./utils/env";
import { Log } from "./log";

// @ts-ignore
import { getTargetInfoPlistForType } from "@bacons/apple-targets/build/target";
import spawnAsync from "@expo/spawn-async";

export type Options = {
  install: boolean;
};

function getNamedPlugins(
  plugins: NonNullable<ExpoConfig["plugins"]>
): string[] {
  const namedPlugins: string[] = [];
  for (const plugin of plugins) {
    try {
      // @ts-ignore
      const [normal] = normalizeStaticPlugin(plugin);
      if (typeof normal === "string") {
        namedPlugins.push(normal);
      }
    } catch {
      // ignore assertions
    }
  }
  return namedPlugins;
}

function findUpPackageJson(projectRoot: string): string | null {
  let currentDir = projectRoot;
  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    const nextDir = path.dirname(currentDir);
    if (nextDir === currentDir) {
      return null;
    }
    currentDir = nextDir;
  }
}

export async function createAsync(
  target: string,
  props: Options
): Promise<void> {
  const pkgJson = findUpPackageJson(process.cwd());

  if (!pkgJson) {
    throw new Error(
      "Could not find Expo project root directory from: " +
        process.cwd() +
        ". Please run this command from the root directory of your Expo project, or create one with: npx create-expo."
    );
  }

  const projectRoot = path.dirname(pkgJson);

  if (
    props.install &&
    !resolveFrom.silent(projectRoot, "@bacons/apple-targets")
  ) {
    Log.log("Installing @bacons/apple-targets package...");
    // This ensures the config plugin is added.
    await spawnAsync("npx", ["expo", "install", "@bacons/apple-targets"], {
      // Forward the stdio of the parent process
      stdio: "inherit",
    });
  }

  const config = getConfig(projectRoot).exp;

  const namedPlugins = getNamedPlugins(config.plugins || []);
  if (!namedPlugins.includes("@bacons/apple-targets")) {
    const modification = await modifyConfigAsync(projectRoot, {
      plugins: [...(config.plugins || []), "@bacons/apple-targets"],
    });

    if (modification.type !== "success") {
      warnAboutConfigAndThrow(modification.type, modification.message!, {
        plugins: ["@bacons/apple-targets"],
      });
    }
  }
  let resolvedTarget: string | null = null;
  // @ts-ignore: This guards against someone passing --template without a name after it.
  if (target === true || !target) {
    resolvedTarget = await promptTargetAsync();
  } else {
    resolvedTarget = target;
    console.log(chalk`Creating a {cyan ${resolvedTarget}} Apple target.\n`);
  }

  if (!resolvedTarget) {
    throw new Error("No --target was provided.");
  }
  assertValidTarget(resolvedTarget);

  const targetDir = path.join(projectRoot, "targets", resolvedTarget);

  if (fs.existsSync(targetDir)) {
    // Check if the target directory is empty
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      if (
        env.CI ||
        !(await confirmAsync({
          message: `Target directory ${targetDir} is not empty. Continue?`,
        }))
      ) {
        // TODO: Maybe allow a force flag to overwrite the target directory
        throw new Error(`Target directory ${targetDir} is not empty.`);
      }

      // Remove all files in the target directory
      await remove(targetDir);
    }
  }

  await fs.promises.mkdir(targetDir, { recursive: true });

  // Write the target config file

  const targetTemplate = path.join(vendorTemplatePath, resolvedTarget);

  if (fs.existsSync(targetTemplate)) {
    // Deeply copy all files from the template directory to the target directory
    await copy(targetTemplate, targetDir);
  }

  Log.log(chalk`Writing {cyan expo-target.config.js} file`);
  await fs.promises.writeFile(
    path.join(targetDir, "expo-target.config.js"),
    getTemplateConfig(resolvedTarget)
  );

  Log.log(chalk`Writing {cyan Info.plist} file`);
  await fs.promises.writeFile(
    path.join(targetDir, "Info.plist"),
    plist.build(getTargetInfoPlistForType(resolvedTarget as any))
  );

  Log.log(
    chalk`Target created! Run {cyan npx expo prebuild -p ios} to fully generate the target. Develop native code in Xcode.`
  );
}

function warnAboutConfigAndThrow(
  type: string,
  message: string,
  edits: Partial<ExpoConfig>
) {
  Log.log();
  if (type === "warn") {
    // The project is using a dynamic config, give the user a helpful log and bail out.
    Log.log(chalk.yellow(message));
  }
  notifyAboutManualConfigEdits(edits);
  process.exit(1);
}

function notifyAboutManualConfigEdits(edits: Partial<ExpoConfig>) {
  Log.log(chalk.cyan(`Please add the following to your Expo config`));
  Log.log();
  Log.log(JSON.stringify(edits, null, 2));
  Log.log();
}

export function getTemplateConfig(target: string) {
  const shouldAddIcon = [
    "widget",
    "clip",
    "action",
    "safari",
    "share",
    "watch",
  ].includes(target);

  const lines = [
    `/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */`,
    `module.exports = config => ({`,
    `  type: ${JSON.stringify(target)},`,
  ];

  if (shouldAddIcon) {
    lines.push(`  icon: 'https://github.com/expo.png',`);
  }

  if (target === "watch") {
    lines.push('  colors: { $accent: "darkcyan", },');
    lines.push('  deploymentTarget: "9.4",');
  } else if (target === "action") {
    lines.push('  colors: { TouchBarBezel: "#000000", },');
  } else if (target === "share") {
    lines.push(
      '  "frameworks": ["UIKit", "Social", "MobileCoreServices", "UniformTypeIdentifiers"],'
    );
  }

  if (RECOMMENDED_ENTITLEMENTS[target]) {
    lines.push(
      `  entitlements: ${JSON.stringify(RECOMMENDED_ENTITLEMENTS[target])},`
    );
  } else {
    lines.push(`  entitlements: { /* Add entitlements */ },`);
  }

  lines.push(`});`);

  return lines.join("\n");
}

const vendorTemplatePath = path.resolve(__dirname, "../templates");

// @ts-expect-error
const RECOMMENDED_ENTITLEMENTS: Record<Partial<ExtensionType>, any> = {
  "shield-config": {
    "com.apple.developer.family-controls": true,
  },
  "shield-action": {
    "com.apple.developer.family-controls": true,
  },
  "activity-report": {
    "com.apple.developer.family-controls": true,
  },
  "activity-monitor": {
    "com.apple.developer.family-controls": true,
  },
  "autofill-credentials": {
    "com.apple.developer.authentication-services.autofill-credential-provider":
      true,
  },
  classkit: {
    "com.apple.developer.ClassKit-environment": true,
  },
  "credentials-provider": {
    "com.apple.developer.authentication-services.autofill-credential-provider":
      true,
  },
  "device-activity-monitor": {
    "com.apple.developer.family-controls": true,
  },
};
