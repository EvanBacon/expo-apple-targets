/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "clip",
  icon: "../../assets/icon.png",
  colors: {
    $accent: "darkcyan",
  },
  entitlements: {
    "com.apple.developer.parent-application-identifiers": [
      `$(AppIdentifierPrefix)${config.ios.bundleIdentifier}`,
    ],
  },
});
