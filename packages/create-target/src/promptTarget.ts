import chalk from "chalk";
import prompts from "prompts";

import { env } from "./utils/env";

export const TARGETS = [
  {
    title: "Widget",
    value: "widget",
    description: "Home screen widget",
  },
  {
    title: "App Clip",
    value: "clip",
    description: "Instantly open your app without installing",
  },
];

export function assertValidTarget(target: any): asserts target is string {
  if (!TARGETS.some((t) => t.value === target)) {
    console.log();
    console.log(
      chalk`Invalid target: {red ${target}}. Please choose one of: {cyan ${TARGETS.map(
        (t) => t.value
      ).join(", ")}}`
    );
    console.log();
    process.exit(1);
  }
}

export async function promptTargetAsync() {
  if (env.CI) {
    throw new Error("Cannot prompt for target in CI");
  }

  const { answer } = await prompts({
    type: "select",
    name: "answer",
    message: "Choose a target:",
    choices: TARGETS,
  });

  if (!answer) {
    console.log();
    console.log(
      chalk`Please specify the target, example: {cyan --target widget}`
    );
    console.log();
    process.exit(1);
  }

  return answer;
}
