import { XcodeProject } from "@bacons/xcode";
import { ConfigPlugin } from "expo/config-plugins";

import { Entitlements } from "./config";
import { getAuxiliaryTargets, getMainAppTarget } from "./target";
import { withXcodeProjectBeta } from "./with-bacons-xcode";

const debug = require("debug")("expo:target:eas") as typeof console.log;

function safeSet(obj: any, key: string, value: any) {
  const segments = key.split(".");
  const last = segments.pop();
  segments.forEach((segment) => {
    if (!obj[segment]) {
      obj[segment] = {};
    }
    obj = obj[segment];
  });
  if (!obj[last!]) {
    obj[last!] = value;
  }

  return obj;
}

// TODO: This should all go into EAS instead.
export const withEASTargets: ConfigPlugin<{
  bundleIdentifier: string;
  targetName: string;
  entitlements?: Record<string, any>;
}> = (config, { bundleIdentifier, targetName, entitlements }) => {
  // Extra EAS targets
  safeSet(config, "extra.eas.build.experimental.ios.appExtensions", []);

  const existing =
    config.extra!.eas.build.experimental.ios.appExtensions.findIndex(
      (ext: any) => ext.bundleIdentifier === bundleIdentifier
    );

  const settings = {
    bundleIdentifier,
    targetName,
    entitlements,
  };
  if (existing > -1) {
    debug(
      "Found existing EAS target with bundle identifier: %s",
      bundleIdentifier
    );
    debug("Using new settings: %o", settings);

    config.extra!.eas.build.experimental.ios.appExtensions[existing] = settings;
  } else {
    debug("Adding new iOS target for code signing with EAS: %o", settings);

    config.extra!.eas.build.experimental.ios.appExtensions.push(settings);

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
    safeSet(config, "extra.eas.build.experimental.ios.appExtensions", []);

    const creds = getEASCredentialsForXcodeProject(config.modResults);

    // Warn about duplicates
    config.extra!.eas.build.experimental.ios.appExtensions.forEach(
      (ext: any) => {
        const existing = creds.find(
          (cred) => cred.bundleIdentifier === ext.bundleIdentifier
        );

        if (
          existing &&
          (existing.targetName !== ext.targetName ||
            existing.parentBundleIdentifier !== ext.parentBundleIdentifier)
        ) {
          throw new Error(
            `EAS credentials already has a target "${ext.targetName}" with bundle identifier: ${ext.bundleIdentifier}.`
          );
        }
      }
    );

    config.extra!.eas.build.experimental.ios.appExtensions = [
      ...config.extra!.eas.build.experimental.ios.appExtensions,
      ...creds,
    ];

    return config;
  });
};

export function getEASCredentialsForXcodeProject(
  project: XcodeProject
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
        }) does not have a productName.`
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
