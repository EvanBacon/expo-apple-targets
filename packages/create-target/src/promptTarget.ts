import chalk from "chalk";
import prompts from "prompts";

import { env } from "./utils/env";

export const TARGETS = [
  // Favorites
  {
    title: "Widget",
    value: "widget",
    description: "Home screen widget",
  },

  // Extras (sorted alphabetically)
  { title: "Account Auth", value: "account-auth", description: "" },
  {
    title: "Action",
    value: "action",
    description: "Headless action that appears in share sheets",
  },
  {
    title: "App Clip",
    value: "clip",
    description: "Instantly open your app without installing",
  },
  { title: "App Intent", value: "app-intent", description: "" },
  { title: "Background Download", value: "bg-download", description: "" },
  {
    title: "Credentials Provider",
    value: "credentials-provider",
    description: "",
  },
  {
    title: "Device Activity Monitor",
    value: "device-activity-monitor",
    description: "",
  },
  {
    title: "Keyboard Extension",
    value: "keyboard",
    description: "Custom system keyboard",
  },
  { title: "Location Push", value: "location-push", description: "" },
  { title: "Matter", value: "matter", description: "" },
  {
    title: "Network Extension: Packet Tunnel Provider",
    value: "network-packet-tunnel",
    description: "",
  },
  {
    title: "Network Extension: App Proxy",
    value: "network-app-proxy",
    description: "",
  },
  {
    title: "Network Extension: DNS Proxy",
    value: "network-dns-proxy",
    description: "",
  },
  {
    title: "Network Extension: Filter Data",
    value: "network-filter-data",
    description: "",
  },
  {
    title: "Notification Content",
    value: "notification-content",
    description: "",
  },
  {
    title: "Notification Service",
    value: "notification-service",
    description: "",
  },
  {
    title: "Quicklook Thumbnail",
    value: "quicklook-thumbnail",
    description: "",
  },
  { title: "Spotlight", value: "spotlight", description: "" },
  { title: "Safari Extension", value: "safari", description: "" },
  { title: "Siri Intent", value: "intent", description: "" },
  { title: "Siri Intent UI", value: "intent-ui", description: "" },
  { title: "Share Extension", value: "share", description: "" },
  { title: "Watch", value: "watch", description: "" },
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
