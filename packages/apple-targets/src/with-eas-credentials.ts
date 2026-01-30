import { XcodeProject } from "@bacons/xcode";
import type { ExpoConfig } from "expo/config";
import type { ConfigPlugin } from "expo/config-plugins";

import { Entitlements } from "./config";
import { getAuxiliaryTargets, getMainAppTarget } from "./target";
import { withXcodeProjectBeta } from "./with-bacons-xcode";

const debug = require("debug")("expo:target:eas") as typeof console.log;

type EASAppExtension = {
  bundleIdentifier: string;
  targetName: string;
  entitlements?: Record<string, unknown>;
};

function getAppExtensions(config: ExpoConfig): EASAppExtension[] {
  return config.extra!.eas.build.experimental.ios
    .appExtensions as EASAppExtension[];
}

function safeSet(
  obj: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const segments = key.split(".");
  const last = segments.pop()!;
  let current = obj as Record<string, unknown>;
  segments.forEach((segment) => {
    if (!current[segment]) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  });
  if (!current[last]) {
    current[last] = value;
  }

  return current;
}

// TODO: This should all go into EAS instead.
export const withEASTargets: ConfigPlugin<{
  bundleIdentifier: string;
  targetName: string;
  entitlements?: Record<string, unknown>;
}> = (config, { bundleIdentifier, targetName, entitlements }) => {
  // Extra EAS targets
  safeSet(
    config as unknown as Record<string, unknown>,
    "extra.eas.build.experimental.ios.appExtensions",
    [],
  );

  const extensions = getAppExtensions(config);

  const existingIndex = extensions.findIndex(
    (ext) => ext.bundleIdentifier === bundleIdentifier,
  );

  const settings: EASAppExtension = {
    bundleIdentifier,
    targetName,
    entitlements,
  };
  if (existingIndex > -1) {
    debug(
      "Found existing EAS target with bundle identifier: %s",
      bundleIdentifier,
    );
    debug("Using new settings: %o", settings);

    extensions[existingIndex] = settings;
  } else {
    debug("Adding new iOS target for code signing with EAS: %o", settings);

    extensions.push(settings);

    // "appExtensions": [
    //   {
    //     "targetName": "widgets",
    //     "bundleIdentifier": "com.evanbacon.pillarvalley.widgets",
    //     "entitlements": {
    //       "com.apple.security.application-groups": [
    //         "group.bacon.data"
    //       ]
    //     }
    //   }
    // ]
  }

  return config;
};

type EASCredentials = {
  targetName: string;
  bundleIdentifier: string;
  parentBundleIdentifier: string;
  entitlements?: Entitlements;
};

export const withAutoEasExtensionCredentials: ConfigPlugin = (config) => {
  return withXcodeProjectBeta(config, async (config) => {
    safeSet(
      config as unknown as Record<string, unknown>,
      "extra.eas.build.experimental.ios.appExtensions",
      [],
    );

    const creds = getEASCredentialsForXcodeProject(config.modResults);

    const extensions = getAppExtensions(config);

    // Warn about duplicates
    extensions.forEach((ext) => {
      const existing = creds.find(
        (cred) => cred.bundleIdentifier === ext.bundleIdentifier,
      );

      if (
        existing &&
        (existing.targetName !== ext.targetName ||
          existing.parentBundleIdentifier !==
            (ext as unknown as EASCredentials).parentBundleIdentifier)
      ) {
        throw new Error(
          `EAS credentials already has a target "${ext.targetName}" with bundle identifier: ${ext.bundleIdentifier}.`,
        );
      }
    });

    config.extra!.eas.build.experimental.ios.appExtensions = [
      ...extensions,
      ...creds,
    ];

    return config;
  });
};

export function getEASCredentialsForXcodeProject(
  project: XcodeProject,
): EASCredentials[] {
  const parentBundleIdentifier =
    getMainAppTarget(project).getDefaultConfiguration().props.buildSettings
      .PRODUCT_BUNDLE_IDENTIFIER;

  const targets = getAuxiliaryTargets(project);

  return targets.map((target) => {
    const config = target.getDefaultConfiguration();

    const entitlements = config.getEntitlements();

    const targetName = target.props.productName;

    if (!targetName) {
      throw new Error(
        `Target ${target.getDisplayName()} (${
          target.uuid
        }) does not have a productName.`,
      );
    }

    return {
      targetName,
      bundleIdentifier: config.props.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER,
      parentBundleIdentifier,
      entitlements,
    };
  });
}
