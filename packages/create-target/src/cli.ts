#!/usr/bin/env node
import { Spec } from "arg";
import chalk from "chalk";

import { CLI_NAME } from "./cmd";
import { ExitError } from "./error";
import { Log } from "./log";
import {
  assertWithOptionsArgs,
  printHelp,
  resolveStringOrBooleanArgsAsync,
} from "./utils/args";

const debug = require("debug")("expo:create-target") as typeof console.log;

// `npx create-target`
// pick type of target
// find-up expo project
// `npx expo install @bacons/apple-targets`
// create `/targets/<name>` directory
// add expo-target.config.js file
// inject some template files.
// Log about needing to re-run prebuild.

async function run() {
  const argv = process.argv.slice(2) ?? [];
  const rawArgsMap: Spec = {
    // Types
    "--no-install": Boolean,
    "--help": Boolean,
    "--version": Boolean,
    // Aliases
    "-h": "--help",
    "-v": "--version",
  };
  const args = assertWithOptionsArgs(rawArgsMap, {
    argv,
    permissive: true,
  });

  if (args["--version"]) {
    Log.exit(require("../package.json").version, 0);
  }

  if (args["--help"]) {
    const nameWithoutCreate = CLI_NAME.replace("create-", "");
    printHelp(
      `Creates a new Expo Apple target`,
      chalk`npx ${CLI_NAME} {cyan <target>} [options]`,
      [
        `    --no-install      Skip installing npm packages`,
        `-v, --version         Version number`,
        `-h, --help            Usage info`,
      ].join("\n"),
      chalk`
    {gray The package manager used for installing}
    {gray node modules is based on how you invoke the CLI:}

    {bold  npm:} {cyan npx ${CLI_NAME}}
    {bold yarn:} {cyan yarn create ${nameWithoutCreate}}
    {bold pnpm:} {cyan pnpm create ${nameWithoutCreate}}
    {bold  bun:} {cyan bun create ${nameWithoutCreate}}
    `
    );
  }

  try {
    const parsed = await resolveStringOrBooleanArgsAsync(argv, rawArgsMap, {});

    debug(`Default args:\n%O`, args);
    debug(`Parsed:\n%O`, parsed);

    const { createAsync } = await import("./createAsync");
    await createAsync(
      // This is the target
      parsed.projectRoot,
      {
        install: !args["--no-install"],
      }
    );
  } catch (error: any) {
    // ExitError has already been logged, all others should be logged before exiting.
    if (!(error instanceof ExitError)) {
      Log.exception(error);
    }

    // Exit with the error code or non-zero.
    // Ensure we exit even if the telemetry fails.
    process.exit(error.code || 1);
  } finally {
    const shouldUpdate = await (await import("./utils/update-check")).default;
    await shouldUpdate();
  }
}

run();
