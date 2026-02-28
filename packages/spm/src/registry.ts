import _debug from "debug";

const debug = _debug("spm:registry");

/** Package alias with URL and optional default products. */
interface PackageAliasInfo {
  url: string;
  /** Default products when none specified. Falls back to package name if omitted. */
  products?: string[];
}

/**
 * Well-known package aliases mapping short names to GitHub URLs and default products.
 * These allow users to write `"firebase": "^11.0.0"` instead of the full URL.
 */
export const PACKAGE_ALIAS_REGISTRY: Record<string, PackageAliasInfo> = {
  firebase: {
    url: "https://github.com/firebase/firebase-ios-sdk.git",
    products: ["FirebaseCore"],
  },
  alamofire: {
    url: "https://github.com/Alamofire/Alamofire.git",
    products: ["Alamofire"],
  },
  moya: {
    url: "https://github.com/Moya/Moya.git",
    products: ["Moya"],
  },
  rxswift: {
    url: "https://github.com/ReactiveX/RxSwift.git",
    products: ["RxSwift"],
  },
  realm: {
    url: "https://github.com/realm/realm-swift.git",
    products: ["RealmSwift"],
  },
  snapkit: {
    url: "https://github.com/SnapKit/SnapKit.git",
    products: ["SnapKit"],
  },
  kingfisher: {
    url: "https://github.com/onevcat/Kingfisher.git",
    products: ["Kingfisher"],
  },
  lottie: {
    url: "https://github.com/airbnb/lottie-ios.git",
    products: ["Lottie"],
  },
  "swift-argument-parser": {
    url: "https://github.com/apple/swift-argument-parser.git",
    products: ["ArgumentParser"],
  },
  "swift-log": {
    url: "https://github.com/apple/swift-log.git",
    products: ["Logging"],
  },
  "swift-crypto": {
    url: "https://github.com/apple/swift-crypto.git",
    products: ["Crypto"],
  },
  "swift-collections": {
    url: "https://github.com/apple/swift-collections.git",
    products: ["Collections"],
  },
  "swift-algorithms": {
    url: "https://github.com/apple/swift-algorithms.git",
    products: ["Algorithms"],
  },
  "swift-numerics": {
    url: "https://github.com/apple/swift-numerics.git",
    products: ["Numerics"],
  },
  sdwebimage: {
    url: "https://github.com/SDWebImage/SDWebImage.git",
    products: ["SDWebImage"],
  },
  "swift-protobuf": {
    url: "https://github.com/apple/swift-protobuf.git",
    products: ["SwiftProtobuf"],
  },
  grdb: {
    url: "https://github.com/groue/GRDB.swift.git",
    products: ["GRDB"],
  },
  nuke: {
    url: "https://github.com/kean/Nuke.git",
    products: ["Nuke"],
  },
  "the-composable-architecture": {
    url: "https://github.com/pointfreeco/swift-composable-architecture.git",
    products: ["ComposableArchitecture"],
  },
  swiftyjson: {
    url: "https://github.com/SwiftyJSON/SwiftyJSON.git",
    products: ["SwiftyJSON"],
  },
};

/** Simple URL-only map for backwards compatibility. */
export const PACKAGE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PACKAGE_ALIAS_REGISTRY).map(([key, info]) => [key, info.url])
);

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
 * Get the default products for a known package alias.
 * Returns undefined if the identifier is not a known alias or has no default products.
 */
export function getDefaultProductsForAlias(
  identifier: string
): string[] | undefined {
  const lower = identifier.toLowerCase();
  return PACKAGE_ALIAS_REGISTRY[lower]?.products;
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
