#!/usr/bin/env bun
/**
 * Scans the local Xcode installation to discover all available Apple target/extension types.
 *
 * Usage:
 *   bun scripts/scan-xcode-targets.ts [--xcode-path /Applications/Xcode.app] [--json] [--diff]
 *
 * Options:
 *   --xcode-path  Path to Xcode.app (default: /Applications/Xcode.app)
 *   --json        Output raw JSON instead of formatted table
 *   --diff        Compare discovered types against the project's ExtensionType enum
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtensionTemplate {
  /** Template directory name, e.g. "Widget Extension" */
  name: string;
  /** Xcode template identifier, e.g. "com.apple.dt.unit.widgetExtension.iOS" */
  identifier: string;
  /** Human-readable description from the template */
  description: string;
  /** NSExtensionPointIdentifier values found in the template */
  extensionPointIdentifiers: string[];
  /** Platform this template belongs to */
  platform: string;
  /** Product types this extension can be hosted by */
  allowableProductTypes: string[];
}

interface ProductType {
  /** e.g. "com.apple.product-type.app-extension" */
  identifier: string;
  /** Human-readable name */
  name: string;
  /** Parent product type identifier */
  basedOn: string | null;
}

interface ScanResult {
  xcodeVersion: string;
  xcodePath: string;
  productTypes: ProductType[];
  templates: ExtensionTemplate[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function plistToJson(path: string): Promise<any> {
  const result =
    await $`plutil -convert json -o - ${path}`.text();
  return JSON.parse(result);
}

/** Extract all NSExtensionPointIdentifier values from a plist object (recursive). */
function extractExtensionPointIds(obj: any): string[] {
  const ids: string[] = [];
  if (obj == null || typeof obj !== "object") return ids;

  if (typeof obj === "string") {
    // Check if the string itself contains the XML key (template Definitions use XML fragments)
    const matches = obj.match(
      /<string>(com\.apple\.[^<]+)<\/string>/g
    );
    if (matches) {
      for (const m of matches) {
        const val = m.replace(/<\/?string>/g, "");
        // Filter to only extension point identifiers (heuristic: they don't end with common non-ext suffixes)
        if (
          !val.includes("product-type") &&
          !val.includes("package-type") &&
          !val.includes("platform.")
        ) {
          ids.push(val);
        }
      }
    }
    return ids;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "NSExtensionPointIdentifier" && typeof value === "string") {
      ids.push(value);
    } else if (key === "EXExtensionPointIdentifier" && typeof value === "string") {
      ids.push(value);
    } else if (typeof value === "string" && value.includes("NSExtensionPointIdentifier")) {
      // XML fragment in Definitions — extract the identifier
      const match = value.match(
        /<key>NSExtensionPointIdentifier<\/key>\s*<string>([^<]+)<\/string>/
      );
      if (match) ids.push(match[1]);
      // Also check EXExtensionPointIdentifier
      const exMatch = value.match(
        /<key>EXExtensionPointIdentifier<\/key>\s*<string>([^<]+)<\/string>/
      );
      if (exMatch) ids.push(exMatch[1]);
    } else if (typeof value === "object") {
      ids.push(...extractExtensionPointIds(value));
    }
  }

  return [...new Set(ids)];
}

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

async function getXcodeVersion(xcodePath: string): Promise<string> {
  try {
    const plist = await plistToJson(
      join(xcodePath, "Contents/version.plist")
    );
    return `${plist.CFBundleShortVersionString} (${plist.ProductBuildVersion})`;
  } catch {
    return "unknown";
  }
}

async function scanProductTypes(xcodePath: string): Promise<ProductType[]> {
  const specDir = join(
    xcodePath,
    "Contents/SharedFrameworks/XCBuild.framework/Versions/A/PlugIns/XCBBuildService.bundle/Contents/PlugIns/XCBSpecifications.ideplugin/Contents/Resources"
  );

  const specFiles = [
    "DarwinProductTypes.xcspec",
    "ProductTypes.xcspec",
    "macOSProductTypes.xcspec",
  ];

  const types: ProductType[] = [];

  for (const file of specFiles) {
    const path = join(specDir, file);
    if (!existsSync(path)) continue;

    try {
      const entries: any[] = await plistToJson(path);
      for (const entry of entries) {
        if (entry.Type === "ProductType" && entry.Identifier) {
          types.push({
            identifier: entry.Identifier,
            name: entry.Name || entry.DefaultTargetName || entry.Identifier,
            basedOn: entry.BasedOn || null,
          });
        }
      }
    } catch (e) {
      console.error(`Warning: Failed to parse ${file}: ${e}`);
    }
  }

  return types;
}

const PLATFORM_MAP: Record<string, string> = {
  "iPhoneOS.platform": "iOS",
  "MacOSX.platform": "macOS",
  "WatchOS.platform": "watchOS",
  "AppleTVOS.platform": "tvOS",
  "XROS.platform": "visionOS",
};

async function scanTemplates(xcodePath: string): Promise<ExtensionTemplate[]> {
  const platformsDir = join(
    xcodePath,
    "Contents/Developer/Platforms"
  );

  const templates: ExtensionTemplate[] = [];

  for (const [platformDir, osLabel] of Object.entries(PLATFORM_MAP)) {
    const extDir = join(
      platformsDir,
      platformDir,
      "Developer/Library/Xcode/Templates/Project Templates",
      osLabel,
      "Application Extension"
    );

    if (!existsSync(extDir)) continue;

    const entries = await readdir(extDir, { withFileTypes: true });
    const xctemplates = entries
      .filter((e) => e.isDirectory() && e.name.endsWith(".xctemplate"))
      .map((e) => e.name);

    for (const tmplDir of xctemplates) {
      const plistPath = join(extDir, tmplDir, "TemplateInfo.plist");
      if (!existsSync(plistPath)) continue;

      try {
        const plist = await plistToJson(plistPath);
        const name = tmplDir.replace(".xctemplate", "");
        const extPointIds = extractExtensionPointIds(plist);

        templates.push({
          name,
          identifier: plist.Identifier || "",
          description: plist.Description || "",
          extensionPointIdentifiers: extPointIds,
          platform: osLabel,
          allowableProductTypes:
            plist.AssociatedTargetSpecification?.AllowableProductTypes || [],
        });
      } catch (e) {
        console.error(`Warning: Failed to parse ${tmplDir}: ${e}`);
      }
    }
  }

  return templates;
}

// ---------------------------------------------------------------------------
// Diff against project ExtensionType
// ---------------------------------------------------------------------------

/** Known extension point IDs from the project's KNOWN_EXTENSION_POINT_IDENTIFIERS */
const PROJECT_KNOWN_IDS = new Set([
  "com.apple.message-payload-provider",
  "com.apple.widgetkit-extension",
  "com.apple.usernotifications.content-extension",
  "com.apple.share-services",
  "com.apple.usernotifications.service",
  "com.apple.spotlight.import",
  "com.apple.intents-service",
  "com.apple.intents-ui-service",
  "com.apple.Safari.web-extension",
  "com.apple.background-asset-downloader-extension",
  "com.apple.matter.support.extension.device-setup",
  "com.apple.quicklook.thumbnail",
  "com.apple.location.push.service",
  "com.apple.authentication-services-credential-provider-ui",
  "com.apple.authentication-services-account-authentication-modification-ui",
  "com.apple.services",
  "com.apple.appintents-extension",
  "com.apple.deviceactivity.monitor-extension",
  "com.apple.networkextension.packet-tunnel",
  "com.apple.networkextension.app-proxy",
  "com.apple.networkextension.dns-proxy",
  "com.apple.networkextension.filter-data",
  "com.apple.keyboard-service",
  "com.apple.Safari.content-blocker",
]);

function diffWithProject(templates: ExtensionTemplate[]) {
  // Collect all unique extension point IDs from iOS templates
  const iosIds = new Set<string>();
  for (const t of templates) {
    if (t.platform === "iOS") {
      for (const id of t.extensionPointIdentifiers) {
        iosIds.add(id);
      }
    }
  }

  const missing = [...iosIds].filter((id) => !PROJECT_KNOWN_IDS.has(id)).sort();
  const extra = [...PROJECT_KNOWN_IDS].filter((id) => !iosIds.has(id)).sort();

  return { missing, extra, iosIds: [...iosIds].sort() };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const xcodePathIdx = args.indexOf("--xcode-path");
  const xcodePath =
    xcodePathIdx >= 0
      ? args[xcodePathIdx + 1]
      : "/Applications/Xcode.app";

  const jsonMode = args.includes("--json");
  const diffMode = args.includes("--diff");

  if (!existsSync(xcodePath)) {
    console.error(`Xcode not found at: ${xcodePath}`);
    process.exit(1);
  }

  const [xcodeVersion, productTypes, templates] = await Promise.all([
    getXcodeVersion(xcodePath),
    scanProductTypes(xcodePath),
    scanTemplates(xcodePath),
  ]);

  const result: ScanResult = {
    xcodeVersion,
    xcodePath,
    productTypes,
    templates,
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Formatted output
  console.log(`Xcode: ${xcodeVersion}`);
  console.log(`Path:  ${xcodePath}\n`);

  // Product types
  console.log(`=== Product Types (${productTypes.length}) ===\n`);
  for (const pt of productTypes) {
    const base = pt.basedOn ? ` (extends ${pt.basedOn})` : "";
    console.log(`  ${pt.identifier}${base}`);
    console.log(`    ${pt.name}`);
  }

  // Templates by platform
  console.log(`\n=== Extension Templates (${templates.length} total) ===\n`);
  const byPlatform = Object.groupBy(templates, (t) => t.platform);
  for (const [platform, platTemplates] of Object.entries(byPlatform)) {
    if (!platTemplates) continue;
    console.log(`--- ${platform} (${platTemplates.length}) ---`);
    for (const t of platTemplates.sort((a, b) => a.name.localeCompare(b.name))) {
      const ids = t.extensionPointIdentifiers.length
        ? t.extensionPointIdentifiers.join(", ")
        : "(no extension point ID)";
      console.log(`  ${t.name}`);
      console.log(`    ${ids}`);
    }
    console.log();
  }

  // Diff mode
  if (diffMode) {
    console.log("=== Diff with @bacons/apple-targets ExtensionType ===\n");
    const { missing, extra } = diffWithProject(templates);

    if (missing.length) {
      console.log("iOS extension point IDs NOT in project:");
      for (const id of missing) {
        const tmpl = templates.find(
          (t) => t.platform === "iOS" && t.extensionPointIdentifiers.includes(id)
        );
        console.log(`  ${id}`);
        if (tmpl) console.log(`    Template: ${tmpl.name}`);
      }
      console.log();
    }

    if (extra.length) {
      console.log("Project IDs not found in Xcode iOS templates:");
      for (const id of extra) {
        console.log(`  ${id}`);
      }
      console.log();
    }

    if (!missing.length && !extra.length) {
      console.log("All iOS extension point IDs match!\n");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
