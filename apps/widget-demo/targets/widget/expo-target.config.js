/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "My Widget 😄",
  icon: "https://github.com/expo.png",
  entitlements: {
    /* Add entitlements */
  },
  intents: [
    {
      displayName: "Launch Bacon",
      description: "A an OPEN BACON control that runs a timer.",
      label: "Bacon",
      icon: "laurel.leading",
      url: "https://pillarvalley.expo.app/settings",
    },
    {
      displayName: "Launch Eggs",
      description: "A control that launches eggs.",
      label: "Expo",
      icon: "laurel.trailing",
      url: "https://expo.dev",
    },
  ],
});
