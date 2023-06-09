require("ts-node/register");
const { sync: globSync } = require("glob");
const path = require("path");

const plugin = require("./widget-plugin/withWidget").default;
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    // [
    //   plugin,
    //   {
    //     type: "widget",
    //     directory: "beta-boy",
    //     accentColor: "dodgerblue",
    //     icon: "./assets/icon.png",
    //   },
    // ],

    // ...globSync("./targets/*/expo-target.config.json", { absolute: true }).map(
    //   (configPath) => [
    //     plugin,
    //     {
    //       ...require(configPath),
    //       directory: path.relative(process.cwd(), path.dirname(configPath)),
    //     },
    //   ]
    // ),

    // [
    //   plugin,
    //   {
    //     type: require("./targets/nova/expo-target.config.json").type,
    //     directory: "targets/nova",
    //   },
    // ],
    [
      plugin,
      {
        ...require("./targets/beta/expo-target.config.json"),
        directory: "targets/beta",
      },
    ],
    // [
    //   plugin,
    //   {
    //     ...require("./targets/xeno/expo-target.config.json"),
    //     directory: "targets/xeno",
    //   },
    // ],
    // [
    //   plugin,
    //   {
    //     ...require("./targets/oscar/expo-target.config.json"),
    //     directory: "targets/oscar",
    //   },
    // ],
    // [
    //   plugin,
    //   {
    //     type: require("./targets/echo/expo-target.config.json").type,
    //     directory: "targets/echo",
    //   },
    // ],

    // Ensure this runs last
    require("./widget-plugin/withWidget").withXcodeProjectBetaBaseMod,
  ],
});

// module.exports = ({ config }) => config;
