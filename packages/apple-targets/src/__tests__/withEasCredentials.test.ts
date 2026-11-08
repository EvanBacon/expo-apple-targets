import plist from "@expo/plist";
import type { ExpoConfig } from "expo/config";

import { withEASTargets } from "../with-eas-credentials";

/** Same shape as kitchen handwritten entitlements, plus a nested dict. */
const HANDWRITTEN_ENTITLEMENTS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>group.com.bacon.rnbeta</string>
  </array>
  <key>com.apple.developer.authentication-services.autofill-credential-provider</key>
  <true/>
  <key>nested</key>
  <dict>
    <key>inner</key>
    <true/>
  </dict>
</dict>
</plist>
`;

/** Walk the way `@expo/config` `serializeAndEvaluate` does. */
function walkLikeSerialize(val: unknown): unknown {
  if (
    ["undefined", "string", "boolean", "number", "bigint"].includes(typeof val)
  ) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(walkLikeSerialize);
  }
  if (typeof val === "object" && val !== null) {
    const record = val as Record<string, unknown> & {
      hasOwnProperty: (key: string) => boolean;
    };
    const output: Record<string, unknown> = {};
    for (const property in record) {
      // SDK 57 calls the instance method. Null-prototype objects throw here.
      if (record.hasOwnProperty(property)) {
        output[property] = walkLikeSerialize(record[property]);
      }
    }
    return output;
  }
  return val;
}

function createConfig(overrides?: Partial<ExpoConfig>): ExpoConfig {
  return { name: "test", slug: "test", ...overrides };
}

describe(withEASTargets, () => {
  it("adds an app extension to the config", () => {
    expect(
      withEASTargets(createConfig(), {
        bundleIdentifier: "com.widget",
        targetName: "widgets",
        entitlements: {
          "com.apple.security.application-groups": ["group.bacon.data"],
        },
      }),
    ).toEqual(
      expect.objectContaining({
        extra: {
          eas: {
            build: {
              experimental: {
                ios: {
                  appExtensions: [
                    {
                      bundleIdentifier: "com.widget",
                      entitlements: {
                        "com.apple.security.application-groups": [
                          "group.bacon.data",
                        ],
                      },
                      targetName: "widgets",
                    },
                  ],
                },
              },
            },
          },
        },
      }),
    );
  });
  it("doesn't double up app extensions in the config", () => {
    const props = {
      bundleIdentifier: "com.widget",
      targetName: "widgets",
      entitlements: {
        "com.apple.security.application-groups": ["group.bacon.data"],
      },
    } as const;

    const res = withEASTargets(withEASTargets(createConfig(), props), props);
    expect(res.extra!.eas.build.experimental.ios.appExtensions.length).toBe(1);
    expect(res.extra!.eas.build.experimental).toEqual({
      ios: {
        appExtensions: [
          {
            bundleIdentifier: "com.widget",
            entitlements: {
              "com.apple.security.application-groups": ["group.bacon.data"],
            },
            targetName: "widgets",
          },
        ],
      },
    });
  });
  it("adds extensions when the bundle identifier is different", () => {
    const props = {
      bundleIdentifier: "com.widget",
      targetName: "widgets",
      entitlements: {
        "com.apple.security.application-groups": ["group.bacon.data"],
      },
    } as const;

    let res = withEASTargets(createConfig(), props);

    res = withEASTargets(res, {
      ...props,
      bundleIdentifier: "com.widget2",
    });
    expect(res.extra!.eas.build.experimental.ios.appExtensions.length).toBe(2);
  });
  it("stores plist-parsed entitlements as a plain object the config serializer can walk", () => {
    const parsed = plist.parse(HANDWRITTEN_ENTITLEMENTS_PLIST) as Record<
      string,
      unknown
    >;
    expect(Object.getPrototypeOf(parsed)).toBe(null);
    expect(() => walkLikeSerialize(parsed)).toThrow(TypeError);

    const res = withEASTargets(createConfig(), {
      bundleIdentifier: "com.bacon.kitchen.share",
      targetName: "shareextension",
      entitlements: parsed,
    });
    const stored =
      res.extra!.eas.build.experimental.ios.appExtensions[0].entitlements;

    expect(Object.getPrototypeOf(stored)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(stored.nested)).toBe(Object.prototype);
    expect(walkLikeSerialize(stored)).toEqual({
      "com.apple.security.application-groups": ["group.com.bacon.rnbeta"],
      "com.apple.developer.authentication-services.autofill-credential-provider":
        true,
      nested: { inner: true },
    });
  });
  it("rewrites entitlements and name for extensions when the bundle identifier is the same", () => {
    const props = {
      bundleIdentifier: "com.widget",
      targetName: "widgets",
      entitlements: {
        "com.apple.security.application-groups": ["group.bacon.data"],
      },
    } as const;

    let res = withEASTargets(createConfig(), props);

    res = withEASTargets(res, {
      ...props,
      targetName: "widgets2",
      entitlements: {
        foo: "bar",
      },
    });
    expect(res.extra!.eas.build.experimental.ios.appExtensions.length).toBe(1);
    expect(res.extra!.eas.build.experimental).toEqual({
      ios: {
        appExtensions: [
          // Nukes existing value and replaces it with new one
          {
            bundleIdentifier: "com.widget",
            entitlements: {
              foo: "bar",
            },
            targetName: "widgets2",
          },
        ],
      },
    });
  });
});
