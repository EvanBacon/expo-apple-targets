#!/usr/bin/env node
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { assertValidTarget, promptTargetAsync } from "./promptTarget";
import { Log } from "./log";

import { getTargetInfoPlistForType } from "@bacons/apple-targets/build/target";
import spawnAsync from "@expo/spawn-async";

export type Options = {
  install: boolean;
  target?: string | true;
};

const debug = require("debug")("expo:create-target") as typeof console.log;

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
  inputPath: string,
  props: Options
): Promise<void> {
  props.target ??= inputPath;
  const pkgJson = findUpPackageJson(process.cwd());

  if (!pkgJson) {
    throw new Error(
      "Could not find Expo project root directory from: " +
        process.cwd() +
        ". Please run this command from the root directory of your Expo project, or create one with: npx create-expo."
    );
  }

  const projectRoot = path.dirname(pkgJson);

  if (props.install) {
    Log.log("Installing @bacons/apple-targets package...");
    // This ensures the config plugin is added.
    await spawnAsync("npx", ["expo", "install", "@bacons/apple-targets"], {
      // Forward the stdio of the parent process
      stdio: "inherit",
    });
  }

  let resolvedTemplate: string | null = null;
  // @ts-ignore: This guards against someone passing --template without a name after it.
  if (props.target === true || !props.target) {
    resolvedTemplate = await promptTargetAsync();
  } else {
    resolvedTemplate = props.target;
    console.log(chalk`Creating a {cyan ${resolvedTemplate}} Apple target.\n`);
  }

  if (!resolvedTemplate) {
    throw new Error("No --target was provided.");
  }
  assertValidTarget(resolvedTemplate);

  const targetDir = path.join(projectRoot, "targets", resolvedTemplate);

  if (fs.existsSync(targetDir)) {
    // Check if the target directory is empty
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      // TODO: Maybe allow a force flag to overwrite the target directory
      throw new Error(`Target directory ${targetDir} is not empty.`);
    }
  }

  await fs.promises.mkdir(targetDir, { recursive: true });

  // Write the target config file

  const targetTemplate = path.join(vendorTemplatePath, resolvedTemplate);

  if (fs.existsSync(targetTemplate)) {
    // Deeply copy all files from the template directory to the target directory
    await copy(targetTemplate, targetDir);
  }

  await fs.promises.writeFile(
    path.join(targetDir, "expo-target.config.js"),
    getTemplateConfig(resolvedTemplate)
  );

  await fs.promises.writeFile(
    path.join(targetDir, "Info.plist"),
    getTargetInfoPlistForType(resolvedTemplate as any)
  );
}

function getTemplateConfig(target: string) {
  const shouldAddIcon = ["widget", "clip", "action"].includes(target);

  const lines = [
    `/** @type {import('@bacons/apple-targets').ConfigFunction} */`,
    `module.exports = config => ({`,
    `  type: ${JSON.stringify(target)},`,
  ];

  if (shouldAddIcon) {
    lines.push(`  icon: 'https://github.com/expo.png',`);
  }

  if (target === "action") {
    lines.push('  colors: { TouchBarBezel: "#DB739C", },');
  }

  lines.push(`});`);

  return lines.join("\n");
}

import { copy } from "fs-extra";

const vendorTemplatePath = require.resolve("create-target/templates");
