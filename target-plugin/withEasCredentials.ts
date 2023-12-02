import { XcodeProject } from "@bacons/xcode";
import { ConfigPlugin } from "expo/config-plugins";

import { Entitlements } from "./config";
import {
  getAuxiliaryTargets,
  getDefaultBuildConfigurationForTarget,
  getEntitlementsForBuildConfiguration,
  getMainAppTarget,
} from "./target";
import { withXcodeProjectBeta } from "./withXcparse";

function safeSet(obj: any, key: string, value: any) {
  const segments = key.split(".");
  const last = segments.pop();
  segments.forEach((segment) => {
    if (!obj[segment]) {
      obj[segment] = {};
    }
    obj = obj[segment];
  });
  obj[last!] = value;

  return obj;
}

export const withEASTargets: ConfigPlugin<{
  bundleIdentifier: string;
  targetName: string;
  entitlements?: Record<string, any>;
}> = (config, { bundleIdentifier, targetName, entitlements }) => {
  // Extra EAS targets
  safeSet(config, "extra.eas.build.experimental.ios.appExtensions", []);

  const existing =
    config.extra!.eas.build.experimental.ios.appExtensions.findIndex(
      (ext: any) => ext.targetName === targetName
    );

  if (existing > -1) {
    config.extra!.eas.build.experimental.ios.appExtensions[existing] = {
      ...config.extra!.eas.build.experimental.ios.appExtensions[existing],
      bundleIdentifier,
      entitlements: {
        ...config.extra!.eas.build.experimental.ios.appExtensions[existing]
          .entitlements,
        ...entitlements,
      },
    };
  } else {
    config.extra!.eas.build.experimental.ios.appExtensions.push({
      bundleIdentifier,
      targetName,
      entitlements,
    });

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
  const parentBundleIdentifier = getDefaultBuildConfigurationForTarget(
    getMainAppTarget(project)
  ).props.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;

  const targets = getAuxiliaryTargets(project);

  return targets.map((target) => {
    const config = getDefaultBuildConfigurationForTarget(target);

    const entitlements = getEntitlementsForBuildConfiguration(project, config);

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
