/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "Expo Agent",
  icon: "https://agent.expo.dev/static/icon.png",
  entitlements: {
    /* Add entitlements */
  },
  images: {
    expo: "./expo.sfsymbol.svg",
  },  
  colors: {
    $accent: "steelblue",
    $widgetBackground: "dodgerblue",
  },
});
