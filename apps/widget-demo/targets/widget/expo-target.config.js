/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  icon: "https://github.com/expo.png",
  entitlements: {
    /* Add entitlements */
  },
  intents: [
    {
      displayName: "Launch App",
      description: "A an OPEN BACON control that runs a timer.",
      label: "BACON1",
      icon: "laurel.leading",
      url: "https://pillarvalley.netlify.app/settings",
    },
    {
      displayName: "Launch Eggs",
      description: "A control that launches eggs.",
      label: "EGGO!",
      icon: "laurel.trailing",
      url: "https://pillarvalley.netlify.app/settings/icon",
    },
  ],
});
