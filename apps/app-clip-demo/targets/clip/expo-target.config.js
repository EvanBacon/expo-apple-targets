/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "clip",
  icon: "../../assets/icon.png",
  entitlements: {
    "com.apple.developer.associated-domains": [
      "applinks:oct12.staging.expo.app",
      "activitycontinuation:oct12.staging.expo.app",
      "webcredentials:oct12.staging.expo.app",
    ],
  },
};
