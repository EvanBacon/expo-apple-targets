require("ts-node/register");
const { sync: globSync } = require("glob");
const path = require("path");

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
    ...globSync("./targets/*/expo-target.config.json", { absolute: true }).map(
      (configPath) => [
        plugin,
        {
          type: require(configPath).type,
          directory: path.relative(process.cwd(), path.dirname(configPath)),
        },
      ]
    ),

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
