require("ts-node/register");

const plugin = require("./widget-plugin/withWidget").default;
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [
      plugin,
      {
        type: "widget",
        directory: "beta-boy",
        accentColor: "dodgerblue",
        icon: "./assets/icon.png",
      },
    ],
    [
      plugin,
      {
        type: require("./targets/nova/expo-target.config.json").type,
        directory: "targets/nova",
      },
    ],

    // Ensure this runs last
    require("./widget-plugin/withWidget").withXcodeProjectBetaBaseMod,
  ],
});

// module.exports = ({ config }) => config;
