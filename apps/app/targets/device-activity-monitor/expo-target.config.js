/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "device-activity-monitor",
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [
      // Your app group identifier
      "group.ActivityMonitor",
    ],
  },
};
