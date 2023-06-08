require("ts-node/register");
const { sync: globSync } = require("glob");

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
    ...globSync("./targets/*/expo-target.config.json").map((configPath) => [
      plugin,
      {
        type: require(configPath).type,
        directory: configPath.replace("/expo-target.config.json", ""),
      },
    ]),

    // [
    //   plugin,
    //   {
    //     type: require("./targets/nova/expo-target.config.json").type,
    //     directory: "targets/nova",
    //   },
    // ],
    // [
    //   plugin,
    //   {
    //     type: require("./targets/nova/expo-target.config.json").type,
    //     directory: "targets/echo",
    //   },
    // ],

    // Ensure this runs last
    require("./widget-plugin/withWidget").withXcodeProjectBetaBaseMod,
  ],
});

// module.exports = ({ config }) => config;
