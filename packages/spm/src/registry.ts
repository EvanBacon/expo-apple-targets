import _debug from "debug";

const debug = _debug("spm:registry");

/**
 * Well-known package aliases mapping short names to GitHub URLs.
 * These allow users to write `"firebase": "^11.0.0"` instead of the full URL.
 */
export const PACKAGE_ALIASES: Record<string, string> = {
  firebase:
    "https://github.com/firebase/firebase-ios-sdk.git",
  alamofire:
    "https://github.com/Alamofire/Alamofire.git",
  moya: "https://github.com/Moya/Moya.git",
  rxswift:
    "https://github.com/ReactiveX/RxSwift.git",
  realm: "https://github.com/realm/realm-swift.git",
  snapkit: "https://github.com/SnapKit/SnapKit.git",
  kingfisher:
    "https://github.com/onevcat/Kingfisher.git",
  lottie:
    "https://github.com/airbnb/lottie-ios.git",
  "swift-argument-parser":
    "https://github.com/apple/swift-argument-parser.git",
  "swift-log":
    "https://github.com/apple/swift-log.git",
  "swift-crypto":
    "https://github.com/apple/swift-crypto.git",
  "swift-collections":
    "https://github.com/apple/swift-collections.git",
  "swift-algorithms":
    "https://github.com/apple/swift-algorithms.git",
  "swift-numerics":
    "https://github.com/apple/swift-numerics.git",
  sdwebimage:
    "https://github.com/SDWebImage/SDWebImage.git",
  "swift-protobuf":
    "https://github.com/apple/swift-protobuf.git",
  grdb: "https://github.com/groue/GRDB.swift.git",
  nuke: "https://github.com/kean/Nuke.git",
  "the-composable-architecture":
    "https://github.com/pointfreeco/swift-composable-architecture.git",
  swiftyjson:
    "https://github.com/SwiftyJSON/SwiftyJSON.git",
};

/**
 * Resolve a package identifier to a full git URL.
 *
 * Resolution order:
 * 1. Already a full URL — return as-is
 * 2. SSH git@ URL — convert to https
 * 3. Custom alias (user-provided)
 * 4. Built-in alias (PACKAGE_ALIASES)
 * 5. GitHub shorthand (`owner/repo`)
 * 6. Fall through — assume it's a known name (return null if truly unknown)
 */
export function resolvePackageURL(
  identifier: string,
  customAliases?: Record<string, string>
): string | null {
  // 1. Already a full URL
  if (
    identifier.startsWith("https://") ||
    identifier.startsWith("http://")
  ) {
    return ensureGitSuffix(identifier);
  }

  // 2. SSH URL
  if (identifier.startsWith("git@")) {
    return identifier;
  }

  // 3. Custom alias
  if (customAliases?.[identifier]) {
    return ensureGitSuffix(customAliases[identifier]);
  }

  // 4. Built-in alias
  const lower = identifier.toLowerCase();
  if (PACKAGE_ALIASES[lower]) {
    return PACKAGE_ALIASES[lower];
  }

  // 5. GitHub shorthand: "owner/repo"
  if (/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(identifier)) {
    return `https://github.com/${identifier}.git`;
  }

  debug("Could not resolve package URL for: %s", identifier);
  return null;
}

/** Ensure a URL ends with .git for consistency. */
function ensureGitSuffix(url: string): string {
  return url.endsWith(".git") ? url : url + ".git";
}

/**
 * Extract the package name from a git URL.
 * e.g. "https://github.com/firebase/firebase-ios-sdk.git" -> "firebase-ios-sdk"
 */
export function extractPackageName(url: string): string {
  const withoutGit = url.replace(/\.git$/, "");
  const parts = withoutGit.split("/");
  return parts[parts.length - 1] || url;
}

/**
 * Extract product names from a Package.swift manifest string.
 * Parses `.library(name: "...")` and `.executable(name: "...")` declarations.
 */
export function extractProductsFromManifest(
  manifestContent: string
): string[] {
  const products: string[] = [];
  // Match both .library(name: "X" and .executable(name: "X"
  const regex = /\.(library|executable)\(\s*name:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(manifestContent)) !== null) {
    products.push(match[2]);
  }
  return products;
}
