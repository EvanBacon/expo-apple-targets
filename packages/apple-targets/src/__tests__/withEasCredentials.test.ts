import { withEASTargets } from "../withEasCredentials";

describe(withEASTargets, () => {
  it("adds an app extension to the config", () => {
    expect(
      withEASTargets({} as any, {
        bundleIdentifier: "com.widget",
        targetName: "widgets",
        entitlements: {
          "com.apple.security.application-groups": ["group.bacon.data"],
        },
      })
    ).toEqual({
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
    });
  });
  it("doesn't double up app extensions in the config", () => {
    const props = {
      bundleIdentifier: "com.widget",
      targetName: "widgets",
      entitlements: {
        "com.apple.security.application-groups": ["group.bacon.data"],
      },
    } as const;

    const res = withEASTargets(withEASTargets({} as any, props), props);
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

    let res = withEASTargets({} as any, props);

    res = withEASTargets(res, {
      ...props,
      bundleIdentifier: "com.widget2",
    });
    expect(res.extra!.eas.build.experimental.ios.appExtensions.length).toBe(2);
  });
  it("rewrites entitlements and name for extensions when the bundle identifier is the same", () => {
    const props = {
      bundleIdentifier: "com.widget",
      targetName: "widgets",
      entitlements: {
        "com.apple.security.application-groups": ["group.bacon.data"],
      },
    } as const;

    let res = withEASTargets({} as any, props);

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
