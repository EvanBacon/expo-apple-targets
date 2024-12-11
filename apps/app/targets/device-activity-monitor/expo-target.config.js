/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "device-activity-monitor",
  entitlements: {
    "com.apple.developer.family-controls": true,
    // Or generate an app group:
    "com.apple.security.application-groups": [
      `group.${config.ios.bundleIdentifier}.activity-monitor`,
    ],
  },
});
