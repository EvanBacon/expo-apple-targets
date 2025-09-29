/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "My Widget 😄",
  icon: "https://github.com/expo.png",
  entitlements: {
    /* Add entitlements */
  },
  colors: {
    $accent: "steelblue",
    $widgetBackground: "dodgerblue",
  },
});
