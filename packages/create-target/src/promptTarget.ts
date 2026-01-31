import chalk from "chalk";
import prompts from "prompts";

import { env } from "./utils/env";

// @ts-ignore
import { TARGET_REGISTRY } from "@bacons/apple-targets/build/target";

/** Derive the CLI target list from the central registry. Widget is listed first, rest alphabetical. */
export const TARGETS: { title: string; value: string; description: string }[] =
  Object.entries(TARGET_REGISTRY as Record<string, { displayName: string; description?: string; hasNoTemplate?: boolean }>)
    .filter(([, def]) => !def.hasNoTemplate)
    .map(([value, def]) => ({
      title: def.displayName,
      value,
      description: def.description ?? "",
    }))
    .sort((a, b) => {
      // Widget always first
      if (a.value === "widget") return -1;
      if (b.value === "widget") return 1;
      return a.title.localeCompare(b.title);
    });

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

type Question<V extends string = string> = import("prompts").PromptObject<V> & {
  optionsPerPage?: number;
};

type NamelessQuestion = Omit<Question<"value">, "name" | "type">;

/**
 * Create a standard yes/no confirmation that can be cancelled.
 *
 * @param questions
 * @param options
 */
export async function confirmAsync(
  questions: NamelessQuestion,
  options?: prompts.Options
): Promise<boolean> {
  if (env.CI) {
    throw new Error("Cannot prompt for confirmation in CI");
  }
  const { value } = await prompts(
    {
      initial: true,
      ...questions,
      name: "value",
      type: "confirm",
    },
    options
  );
  return value ?? null;
}
