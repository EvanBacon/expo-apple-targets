require("ts-node/register");

const plugin = require("./widget-plugin/withWidget").default;
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [
      plugin,
      {
        directory: "alpha",
        accentColor: "dodgerblue",
        icon: "./assets/icon.png",
      },
    ],
  ],
});

// module.exports = ({ config }) => config;
