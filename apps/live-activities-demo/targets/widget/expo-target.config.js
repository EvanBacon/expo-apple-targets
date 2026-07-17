/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: 'https://github.com/expo.png',
  entitlements: { /* Add entitlements */ },
  infoPlist: {
    NSExtension: {
      NSExtensionPointIdentifier: "com.apple.widgetkit-extension",
    }
  }
});