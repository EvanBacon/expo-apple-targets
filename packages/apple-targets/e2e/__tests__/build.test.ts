import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { TARGET_REGISTRY as TYPE_REGISTRY } from "../../src/target";

/**
 * Target registry: single source of truth for all e2e build targets.
 *
 * - `dir`: directory name under `targets/` in the fixture
 * - `target`: sanitized name (hyphens/non-word chars stripped) used by Xcode
 * - `sdk`: Xcode SDK to build with (default: iphonesimulator)
 * - `deploymentTarget`: optional override for IPHONEOS_DEPLOYMENT_TARGET
 * - `skip`: set to true to skip this target (with `skipReason`)
 * - `skipReason`: explanation for why the target is skipped
 */
interface TargetEntry {
  type: string;
  dir: string;
  target: string;
  sdk?: string;
  deploymentTarget?: string;
  skip?: boolean;
  skipReason?: string;
}

const TARGET_REGISTRY: TargetEntry[] = [
  { type: "account-auth", dir: "account-auth", target: "accountauth" },
  { type: "action", dir: "action", target: "action" },
  { type: "app-intent", dir: "app-intent", target: "appintent" },
  { type: "bg-download", dir: "bg-download", target: "bgdownload" },
  { type: "clip", dir: "clip", target: "clip" },
  {
    type: "content-blocker",
    dir: "content-blocker",
    target: "contentblocker",
  },
  {
    type: "credentials-provider",
    dir: "credentials-provider",
    target: "credentialsprovider",
  },
  {
    type: "device-activity-monitor",
    dir: "device-activity-monitor",
    target: "deviceactivitymonitor",
  },
  { type: "intent", dir: "intent", target: "intent" },
  { type: "intent-ui", dir: "intent-ui", target: "intentui" },
  { type: "keyboard", dir: "keyboard", target: "keyboard" },
  { type: "location-push", dir: "location-push", target: "locationpush" },
  { type: "matter", dir: "matter", target: "matter" },
  {
    type: "network-app-proxy",
    dir: "network-app-proxy",
    target: "networkappproxy",
  },
  {
    type: "network-dns-proxy",
    dir: "network-dns-proxy",
    target: "networkdnsproxy",
  },
  {
    type: "network-filter-data",
    dir: "network-filter-data",
    target: "networkfilterdata",
  },
  {
    type: "network-packet-tunnel",
    dir: "network-packet-tunnel",
    target: "networkpackettunnel",
  },
  {
    type: "notification-content",
    dir: "notification-content",
    target: "notificationcontent",
  },
  {
    type: "notification-service",
    dir: "notification-service",
    target: "notificationservice",
  },
  {
    type: "quicklook-thumbnail",
    dir: "quicklook-thumbnail",
    target: "quicklookthumbnail",
  },
  { type: "safari", dir: "safari", target: "safari" },
  { type: "share", dir: "share", target: "share" },
  { type: "spotlight", dir: "spotlight", target: "spotlight" },
  {
    type: "watch",
    dir: "watch",
    target: "watch",
    sdk: "watchsimulator",
    skip: true,
    skipReason:
      "Watch target requires AppIcon asset catalog which is not generated without an icon config",
  },
  { type: "widget", dir: "widget", target: "widget" },
  { type: "file-provider", dir: "file-provider", target: "fileprovider" },
  {
    type: "broadcast-upload",
    dir: "broadcast-upload",
    target: "broadcastupload",
  },
  { type: "call-directory", dir: "call-directory", target: "calldirectory" },
  { type: "message-filter", dir: "message-filter", target: "messagefilter" },
  {
    type: "file-provider-ui",
    dir: "file-provider-ui",
    target: "fileproviderui",
  },
  {
    type: "broadcast-setup-ui",
    dir: "broadcast-setup-ui",
    target: "broadcastsetupui",
  },
  {
    type: "classkit-context",
    dir: "classkit-context",
    target: "classkitcontext",
  },
  {
    type: "unwanted-communication",
    dir: "unwanted-communication",
    target: "unwantedcommunication",
  },
  { type: "photo-editing", dir: "photo-editing", target: "photoediting" },
  {
    type: "quicklook-preview",
    dir: "quicklook-preview",
    target: "quicklookpreview",
  },
  {
    type: "spotlight-delegate",
    dir: "spotlight-delegate",
    target: "spotlightdelegate",
  },
  {
    type: "virtual-conference",
    dir: "virtual-conference",
    target: "virtualconference",
  },
  { type: "shield-action", dir: "shield-action", target: "shieldaction" },
  { type: "shield-config", dir: "shield-config", target: "shieldconfig" },
  { type: "print-service", dir: "print-service", target: "printservice" },
  { type: "smart-card", dir: "smart-card", target: "smartcard" },
  {
    type: "authentication-services",
    dir: "authentication-services",
    target: "authenticationservices",
  },
];

// Derived from the central TARGET_REGISTRY — no need to maintain by hand.
// Excludes types with hasNoTemplate (e.g. imessage which has no Swift template).
const ALL_EXTENSION_TYPES = Object.entries(TYPE_REGISTRY)
  .filter(([, def]) => !def.hasNoTemplate)
  .map(([type]) => type);

const PROJECT_DIR_FILE = path.join(__dirname, "..", ".e2e-project-dir");
const BUILD_TIMEOUT = 120_000; // 2 minutes per target

let projectDir: string;
let xcodeproj: string;

function getXcodebuildErrors(output: string): string {
  const errorLines = output
    .split("\n")
    .filter((line) => /\berror\b:/i.test(line));
  return errorLines.length > 0
    ? errorLines.join("\n")
    : output.slice(-2000); // fallback: last 2000 chars
}

beforeAll(() => {
  if (!fs.existsSync(PROJECT_DIR_FILE)) {
    throw new Error(
      "E2E project directory not found. Global setup may have failed. " +
        "Expected file: " +
        PROJECT_DIR_FILE
    );
  }

  projectDir = fs.readFileSync(PROJECT_DIR_FILE, "utf-8").trim();

  if (!fs.existsSync(projectDir)) {
    throw new Error(`E2E project directory does not exist: ${projectDir}`);
  }

  const iosDir = path.join(projectDir, "ios");
  const projFiles = fs
    .readdirSync(iosDir)
    .filter((f) => f.endsWith(".xcodeproj"));

  if (projFiles.length === 0) {
    throw new Error(`No .xcodeproj found in ${iosDir}`);
  }

  xcodeproj = path.join(iosDir, projFiles[0]);
});

describe("xcodebuild targets", () => {
  // Meta-test: ensure the registry covers all extension types (minus imessage)
  it("registry covers all ExtensionType values (except imessage)", () => {
    const registeredTypes = new Set(TARGET_REGISTRY.map((t) => t.type));
    const missingTypes = ALL_EXTENSION_TYPES.filter(
      (t) => !registeredTypes.has(t)
    );
    expect(missingTypes).toEqual([]);
  });

  // Meta-test: verify xcodebuild can list the project targets
  it("xcodebuild can list project targets", () => {
    const output = execSync(
      `xcodebuild -project "${xcodeproj}" -list 2>&1`,
      { encoding: "utf-8", timeout: 30_000 }
    );

    const registeredTargets = TARGET_REGISTRY.map((t) => t.target);
    for (const target of registeredTargets) {
      expect(output).toContain(target);
    }
  });

  for (const target of TARGET_REGISTRY) {
    const testFn = target.skip ? it.skip : it;

    testFn(
      `builds ${target.type} (${target.target})`,
      () => {
        const sdk = target.sdk ?? "iphonesimulator";

        const args = [
          "xcodebuild",
          "build",
          `-project "${xcodeproj}"`,
          `-target ${target.target}`,
          `-sdk ${sdk}`,
          "-configuration Debug",
          "CODE_SIGNING_ALLOWED=NO",
          "CODE_SIGN_IDENTITY=-",
        ];

        if (target.deploymentTarget) {
          args.push(
            `IPHONEOS_DEPLOYMENT_TARGET=${target.deploymentTarget}`
          );
        }

        const command = args.join(" ");

        try {
          execSync(`${command} 2>&1`, {
            encoding: "utf-8",
            timeout: BUILD_TIMEOUT,
            cwd: projectDir,
          });
        } catch (error: any) {
          const output = error.stdout ?? error.stderr ?? String(error);
          const errors = getXcodebuildErrors(output);
          throw new Error(
            `xcodebuild failed for ${target.type} (target: ${target.target}, sdk: ${sdk}):\n\n${errors}`
          );
        }
      },
      BUILD_TIMEOUT
    );
  }
});
