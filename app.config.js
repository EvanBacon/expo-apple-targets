require("ts-node/register");

const plugin = require("./widget-plugin/withWidget").default;
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [
      plugin,
      {
        directory: "beta-boy",
        accentColor: "dodgerblue",
        icon: "./assets/icon.png",
      },
    ],
    [
      plugin,
      {
        directory: "second",
        accentColor: "darkteal",
        icon: "./assets/icon.png",
      },
    ],

    // Ensure this runs last
    require("./widget-plugin/withWidget").withXcodeProjectBetaBaseMod,
  ],
});

// module.exports = ({ config }) => config;
