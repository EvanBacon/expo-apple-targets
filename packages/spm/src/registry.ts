/**
 * Swift Package Index integration
 * Provides package discovery and metadata lookup
 */

import { PackageMetadata } from "./types";

/**
 * Common package aliases for well-known Swift packages
 * Maps short names to their GitHub repository URLs
 */
const PACKAGE_ALIASES: Record<string, string> = {
  // Firebase
  firebase: "https://github.com/firebase/firebase-ios-sdk",
  "firebase-ios-sdk": "https://github.com/firebase/firebase-ios-sdk",

  // Networking
  alamofire: "https://github.com/Alamofire/Alamofire",
  moya: "https://github.com/Moya/Moya",

  // Reactive
  rxswift: "https://github.com/ReactiveX/RxSwift",
  combine: "https://github.com/CombineCommunity/CombineExt",

  // Database
  realm: "https://github.com/realm/realm-swift",
  "realm-swift": "https://github.com/realm/realm-swift",
  grdb: "https://github.com/groue/GRDB.swift",

  // UI
  snapkit: "https://github.com/SnapKit/SnapKit",
  kingfisher: "https://github.com/onevcat/Kingfisher",
  lottie: "https://github.com/airbnb/lottie-ios",
  "lottie-ios": "https://github.com/airbnb/lottie-ios",

  // Utilities
  swiftlint: "https://github.com/realm/SwiftLint",
  "swift-argument-parser": "https://github.com/apple/swift-argument-parser",
  "swift-log": "https://github.com/apple/swift-log",
  "swift-crypto": "https://github.com/apple/swift-crypto",

  // Testing
  quick: "https://github.com/Quick/Quick",
  nimble: "https://github.com/Quick/Nimble",

  // Apple
  "swift-collections": "https://github.com/apple/swift-collections",
  "swift-algorithms": "https://github.com/apple/swift-algorithms",
  "swift-numerics": "https://github.com/apple/swift-numerics",
};

/**
 * Cache for package metadata to avoid repeated API calls
 */
const metadataCache = new Map<string, PackageMetadata>();

/**
 * Simple HTTP/HTTPS GET request helper
 */
async function httpGet(urlString: string): Promise<string> {
  const response = await fetch(urlString, {
    method: "GET",
    headers: {
      "User-Agent": "@bacons/spm",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} - ${urlString}`
    );
  }

  return await response.text();
}

/**
 * Resolve a package identifier to a repository URL
 *
 * Resolution order:
 * 1. If it's already a URL (http/https), return as-is
 * 2. Check local package aliases registry
 * 3. Query Swift Package Index API
 * 4. Throw error if not found
 *
 * @param identifier Package identifier (name or URL)
 * @returns Repository URL
 */
export async function resolvePackageURL(identifier: string): Promise<string> {
  // If it's already a full URL, return it
  if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
    return identifier;
  }

  // If it starts with git@, convert to https
  if (identifier.startsWith("git@github.com:")) {
    return identifier.replace("git@github.com:", "https://github.com/");
  }

  // Normalize identifier (lowercase, trim)
  const normalized = identifier.toLowerCase().trim();

  // Check our local aliases first
  if (PACKAGE_ALIASES[normalized]) {
    return PACKAGE_ALIASES[normalized];
  }

  // Try to query Swift Package Index
  try {
    const metadata = await fetchPackageMetadata(identifier);
    if (metadata.url) {
      return metadata.url;
    }
  } catch (error) {
    // Continue to fallback
  }

  // If it looks like a GitHub shorthand (owner/repo), convert it
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(identifier)) {
    return `https://github.com/${identifier}`;
  }

  throw new Error(
    `Unable to resolve package identifier "${identifier}". ` +
      `Please provide a full URL or ensure the package exists in Swift Package Index.`
  );
}

/**
 * Fetch package metadata from Swift Package Index
 *
 * @param identifier Package name or URL
 * @returns Package metadata
 */
export async function fetchPackageMetadata(
  identifier: string
): Promise<PackageMetadata> {
  // Check cache first
  if (metadataCache.has(identifier)) {
    return metadataCache.get(identifier)!;
  }

  try {
    // Swift Package Index API endpoint
    // Note: This is a simplified implementation. The actual API structure may vary.
    // For production, we would need to use the official Swift Package Index API
    const searchUrl = `https://swiftpackageindex.com/api/search?query=${encodeURIComponent(
      identifier
    )}`;

    const data = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent": "@bacons/spm",
        Accept: "application/json",
      },
    }).then((res) => res.json());

    // Parse the response and extract metadata
    // This is a placeholder - actual API response structure may differ
    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      const metadata: PackageMetadata = {
        name: firstResult.name || identifier,
        url: firstResult.url || "",
        versions: firstResult.versions || [],
        products: firstResult.products || [],
        description: firstResult.description || "",
        stars: firstResult.stars || 0,
      };

      // Cache the result
      metadataCache.set(identifier, metadata);
      return metadata;
    }
  } catch (error) {
    // If API fails, try to construct basic metadata
    console.warn(
      `Warning: Unable to fetch metadata for ${identifier} from Swift Package Index. Using fallback.`
    );
  }

  // Fallback: return minimal metadata
  const fallbackMetadata: PackageMetadata = {
    name: identifier,
    url: identifier.startsWith("http") ? identifier : "",
    versions: [],
    products: [],
  };

  return fallbackMetadata;
}

/**
 * Extract products (libraries/frameworks) from a Package.swift manifest
 * This is a simplified parser - in production, we might need more sophisticated parsing
 *
 * @param packageSwiftContent Content of Package.swift file
 * @returns Array of product names
 */
export function extractProductsFromManifest(
  packageSwiftContent: string
): string[] {
  const products: string[] = [];

  // Look for .library(...) declarations
  // Example: .library(name: "Firebase", targets: ["Firebase"])
  const libraryRegex = /\.library\s*\(\s*name\s*:\s*"([^"]+)"/g;
  let match;

  while ((match = libraryRegex.exec(packageSwiftContent)) !== null) {
    products.push(match[1]);
  }

  // Also look for .executable(...) declarations
  const executableRegex = /\.executable\s*\(\s*name\s*:\s*"([^"]+)"/g;
  while ((match = executableRegex.exec(packageSwiftContent)) !== null) {
    products.push(match[1]);
  }

  return products;
}

/**
 * Fetch Package.swift from a repository URL
 * This helps us discover available products
 *
 * @param repoUrl Repository URL
 * @param branch Branch name (defaults to main/master)
 * @returns Package.swift content or null if not found
 */
export async function fetchPackageManifest(
  repoUrl: string,
  branch: string = "main"
): Promise<string | null> {
  try {
    // Convert GitHub URL to raw content URL
    // https://github.com/owner/repo -> https://raw.githubusercontent.com/owner/repo/main/Package.swift
    let rawUrl: string;

    if (repoUrl.includes("github.com")) {
      const parts = repoUrl.replace("https://github.com/", "").split("/");
      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1].replace(".git", "");
        rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/Package.swift`;
      } else {
        return null;
      }
    } else {
      // Non-GitHub repos - not supported yet
      return null;
    }

    return await fetch(rawUrl, {
      method: "GET",
      headers: {
        "User-Agent": "@bacons/spm",
        Accept: "application/json",
      },
    }).then((res) => res.text());
  } catch (error) {
    // Try alternate branch if main doesn't work
    if (branch === "main") {
      return fetchPackageManifest(repoUrl, "master");
    }
    return null;
  }
}

/**
 * Auto-resolve products for a package
 * Tries to fetch Package.swift and extract product names
 *
 * @param repoUrl Repository URL
 * @returns Array of product names, or empty array if unable to resolve
 */
export async function autoResolveProducts(repoUrl: string): Promise<string[]> {
  try {
    const manifest = await fetchPackageManifest(repoUrl);
    if (manifest) {
      const products = extractProductsFromManifest(manifest);
      if (products.length > 0) {
        return products;
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Unable to auto-resolve products for ${repoUrl}:`,
      error
    );
  }

  return [];
}
