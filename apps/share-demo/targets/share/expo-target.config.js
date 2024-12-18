/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "share",
  icon: 'https://github.com/expo.png',
  "frameworks": ["UIKit", "Social", "MobileCoreServices", "UniformTypeIdentifiers"],
  entitlements: { /* Add entitlements */ },
});