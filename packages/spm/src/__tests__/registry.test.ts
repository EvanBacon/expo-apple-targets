import {
  resolvePackageURL,
  extractPackageName,
  extractProductsFromManifest,
  getDefaultProductsForAlias,
  PACKAGE_ALIASES,
  PACKAGE_ALIAS_REGISTRY,
} from "../registry";

describe(resolvePackageURL, () => {
  describe("full URLs", () => {
    it("returns https URLs as-is (with .git suffix)", () => {
      expect(
        resolvePackageURL("https://github.com/firebase/firebase-ios-sdk.git")
      ).toBe("https://github.com/firebase/firebase-ios-sdk.git");
    });

    it("adds .git suffix to https URLs without it", () => {
      expect(
        resolvePackageURL("https://github.com/firebase/firebase-ios-sdk")
      ).toBe("https://github.com/firebase/firebase-ios-sdk.git");
    });

    it("returns SSH URLs as-is", () => {
      expect(
        resolvePackageURL("git@github.com:firebase/firebase-ios-sdk.git")
      ).toBe("git@github.com:firebase/firebase-ios-sdk.git");
    });

    it("handles http URLs", () => {
      expect(
        resolvePackageURL("http://github.com/owner/repo")
      ).toBe("http://github.com/owner/repo.git");
    });
  });

  describe("built-in aliases", () => {
    it("resolves 'firebase' to Firebase iOS SDK", () => {
      expect(resolvePackageURL("firebase")).toBe(
        "https://github.com/firebase/firebase-ios-sdk.git"
      );
    });

    it("resolves 'alamofire'", () => {
      expect(resolvePackageURL("alamofire")).toBe(
        "https://github.com/Alamofire/Alamofire.git"
      );
    });

    it("resolves 'kingfisher'", () => {
      expect(resolvePackageURL("kingfisher")).toBe(
        "https://github.com/onevcat/Kingfisher.git"
      );
    });

    it("resolves 'lottie'", () => {
      expect(resolvePackageURL("lottie")).toBe(
        "https://github.com/airbnb/lottie-ios.git"
      );
    });

    it("resolves 'swift-collections'", () => {
      expect(resolvePackageURL("swift-collections")).toBe(
        "https://github.com/apple/swift-collections.git"
      );
    });

    it("resolves 'the-composable-architecture'", () => {
      expect(resolvePackageURL("the-composable-architecture")).toBe(
        "https://github.com/pointfreeco/swift-composable-architecture.git"
      );
    });

    it("is case-insensitive for built-in aliases", () => {
      expect(resolvePackageURL("Firebase")).toBe(
        "https://github.com/firebase/firebase-ios-sdk.git"
      );
      expect(resolvePackageURL("ALAMOFIRE")).toBe(
        "https://github.com/Alamofire/Alamofire.git"
      );
    });
  });

  describe("custom aliases", () => {
    it("resolves custom alias before built-in", () => {
      const custom = {
        firebase: "https://my-mirror.com/firebase-ios-sdk.git",
      };
      expect(resolvePackageURL("firebase", custom)).toBe(
        "https://my-mirror.com/firebase-ios-sdk.git"
      );
    });

    it("adds .git suffix to custom alias URLs", () => {
      const custom = {
        "my-pkg": "https://github.com/me/my-package",
      };
      expect(resolvePackageURL("my-pkg", custom)).toBe(
        "https://github.com/me/my-package.git"
      );
    });

    it("falls through to built-in if custom alias not found", () => {
      const custom = { "my-pkg": "https://example.com/pkg.git" };
      expect(resolvePackageURL("alamofire", custom)).toBe(
        "https://github.com/Alamofire/Alamofire.git"
      );
    });
  });

  describe("GitHub shorthand", () => {
    it("resolves owner/repo to full GitHub URL", () => {
      expect(resolvePackageURL("apple/swift-algorithms")).toBe(
        "https://github.com/apple/swift-algorithms.git"
      );
    });

    it("handles hyphens and dots in owner/repo", () => {
      expect(resolvePackageURL("my-org/my.package")).toBe(
        "https://github.com/my-org/my.package.git"
      );
    });

    it("handles underscores", () => {
      expect(resolvePackageURL("owner/my_package")).toBe(
        "https://github.com/owner/my_package.git"
      );
    });
  });

  describe("unresolvable identifiers", () => {
    it("returns null for unknown identifiers", () => {
      expect(resolvePackageURL("completely-unknown-package-xyz")).toBeNull();
    });
  });
});

describe(extractPackageName, () => {
  it("extracts name from HTTPS URL with .git", () => {
    expect(
      extractPackageName(
        "https://github.com/firebase/firebase-ios-sdk.git"
      )
    ).toBe("firebase-ios-sdk");
  });

  it("extracts name from HTTPS URL without .git", () => {
    expect(
      extractPackageName("https://github.com/SnapKit/SnapKit")
    ).toBe("SnapKit");
  });

  it("extracts name from SSH URL", () => {
    expect(
      extractPackageName(
        "git@github.com:apple/swift-algorithms.git"
      )
    ).toBe("swift-algorithms");
  });

  it("handles simple string (no slashes)", () => {
    expect(extractPackageName("MyPackage")).toBe("MyPackage");
  });
});

describe(extractProductsFromManifest, () => {
  it("extracts library products", () => {
    const manifest = `
let package = Package(
    name: "MyPackage",
    products: [
        .library(name: "MyLib", targets: ["MyLib"]),
        .library(name: "MyOtherLib", targets: ["MyOtherLib"]),
    ]
)`;
    expect(extractProductsFromManifest(manifest)).toEqual([
      "MyLib",
      "MyOtherLib",
    ]);
  });

  it("extracts executable products", () => {
    const manifest = `
let package = Package(
    products: [
        .executable(name: "MyCLI", targets: ["MyCLI"]),
    ]
)`;
    expect(extractProductsFromManifest(manifest)).toEqual(["MyCLI"]);
  });

  it("extracts mixed products", () => {
    const manifest = `
let package = Package(
    products: [
        .library(name: "Core", targets: ["Core"]),
        .executable(name: "CLI", targets: ["CLI"]),
        .library(name: "Utils", targets: ["Utils"]),
    ]
)`;
    expect(extractProductsFromManifest(manifest)).toEqual([
      "Core",
      "CLI",
      "Utils",
    ]);
  });

  it("returns empty array when no products found", () => {
    expect(
      extractProductsFromManifest("let package = Package(name: 'Foo')")
    ).toEqual([]);
  });

  it("handles single-line product declarations", () => {
    const manifest = `.library(name: "Lib1", targets: ["T1"]), .library(name: "Lib2", targets: ["T2"])`;
    expect(extractProductsFromManifest(manifest)).toEqual([
      "Lib1",
      "Lib2",
    ]);
  });

  it("handles products with extra whitespace", () => {
    const manifest = `.library(  name:  "SpacedLib"  , targets: ["T"] )`;
    expect(extractProductsFromManifest(manifest)).toEqual([
      "SpacedLib",
    ]);
  });
});

describe("PACKAGE_ALIASES", () => {
  it("has entries for common packages", () => {
    const expectedKeys = [
      "firebase",
      "alamofire",
      "rxswift",
      "realm",
      "snapkit",
      "kingfisher",
      "lottie",
      "swift-collections",
      "swift-algorithms",
      "nuke",
    ];
    for (const key of expectedKeys) {
      expect(PACKAGE_ALIASES).toHaveProperty(key);
    }
  });

  it("all aliases are valid URLs ending in .git", () => {
    for (const [key, url] of Object.entries(PACKAGE_ALIASES)) {
      expect(url).toMatch(/^https:\/\/.+\.git$/);
    }
  });
});

describe(getDefaultProductsForAlias, () => {
  it("returns default products for firebase", () => {
    expect(getDefaultProductsForAlias("firebase")).toEqual(["FirebaseCore"]);
  });

  it("returns default products for alamofire", () => {
    expect(getDefaultProductsForAlias("alamofire")).toEqual(["Alamofire"]);
  });

  it("returns default products for lottie", () => {
    expect(getDefaultProductsForAlias("lottie")).toEqual(["Lottie"]);
  });

  it("returns default products for swift-collections", () => {
    expect(getDefaultProductsForAlias("swift-collections")).toEqual(["Collections"]);
  });

  it("returns default products for the-composable-architecture", () => {
    expect(getDefaultProductsForAlias("the-composable-architecture")).toEqual(["ComposableArchitecture"]);
  });

  it("is case-insensitive", () => {
    expect(getDefaultProductsForAlias("Firebase")).toEqual(["FirebaseCore"]);
    expect(getDefaultProductsForAlias("ALAMOFIRE")).toEqual(["Alamofire"]);
  });

  it("returns undefined for unknown aliases", () => {
    expect(getDefaultProductsForAlias("unknown-package")).toBeUndefined();
  });
});

describe("PACKAGE_ALIAS_REGISTRY", () => {
  it("all entries have a url", () => {
    for (const [key, info] of Object.entries(PACKAGE_ALIAS_REGISTRY)) {
      expect(info.url).toMatch(/^https:\/\/.+\.git$/);
    }
  });

  it("all entries have products array", () => {
    for (const [key, info] of Object.entries(PACKAGE_ALIAS_REGISTRY)) {
      expect(Array.isArray(info.products)).toBe(true);
      expect(info.products!.length).toBeGreaterThan(0);
    }
  });
});
