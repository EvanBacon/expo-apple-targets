import fs from "fs";
import path from "path";

/**
 * Expo's "Bundle React Native code and images" phase sources
 * `$PODS_ROOT/../.xcode.env` to set `NODE_BINARY`. CocoaPods writes `PODS_ROOT`
 * only into targets it integrates. When this target has no Pods xcconfig,
 * point `PODS_ROOT` at `ios/Pods` so that path is `ios/.xcode.env`.
 */
export const RN_BUNDLE_PODS_ROOT = "$(SRCROOT)/Pods";

export function targetHasPodsRb(targetDirectory: string): boolean {
  return fs.existsSync(path.join(targetDirectory, "pods.rb"));
}

/**
 * Clips bundle the host app's JS only when they are React Native targets.
 *
 * `pods.rb` is what creates the CocoaPods target. `pod install` then sets
 * `baseConfigurationReference` / `PODS_ROOT` on the matching Xcode target.
 * A native clip (no `pods.rb`) must not inherit the bundle phase: the script
 * runs with an empty `NODE_BINARY` and fails (`: command not found`).
 *
 * An explicit `exportJs` boolean always wins.
 */
export function resolveExportJs(props: {
  type: string;
  exportJs?: boolean;
  targetDirectory: string;
}): boolean {
  if (typeof props.exportJs === "boolean") {
    return props.exportJs;
  }
  return props.type === "clip" && targetHasPodsRb(props.targetDirectory);
}

export function withExportJsBuildSettings<T extends object>(
  settings: { debug: T; release: T },
  exportJs: boolean | undefined,
): {
  debug: T & { PODS_ROOT?: string };
  release: T & { PODS_ROOT?: string };
} {
  if (!exportJs) {
    return settings;
  }
  return {
    debug: { ...settings.debug, PODS_ROOT: RN_BUNDLE_PODS_ROOT },
    release: { ...settings.release, PODS_ROOT: RN_BUNDLE_PODS_ROOT },
  };
}
