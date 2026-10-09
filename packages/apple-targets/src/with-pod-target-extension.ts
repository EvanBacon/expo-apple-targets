import { ConfigPlugin, withPodfile } from "expo/config-plugins";

import {
  upsertPodTargetExtension,
  type PodTargetEntry,
} from "./pod-target-loader";

export {
  buildPodTargetExtension,
  productNameForTarget,
  upsertPodTargetExtension,
  type PodTargetEntry,
} from "./pod-target-loader";

/** Inject a helper which evaluates each target's pods.rb inside the matching Xcode target. */
export const withPodTargetExtension: ConfigPlugin<PodTargetEntry[] | void> = (
  config,
  entries = [],
) =>
  withPodfile(config, (config) => {
    config.modResults.contents = upsertPodTargetExtension(
      config.modResults.contents,
      entries,
    );
    return config;
  });
