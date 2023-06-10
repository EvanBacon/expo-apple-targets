require("ts-node/register");
const { sync: globSync } = require("glob");
const path = require("path");

const plugin = require("./target-plugin/withWidget").default;

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...globSync("./targets/*/expo-target.config.json", {
      absolute: true,
    }).map((configPath) => [
      plugin,
      {
        // Change this as needed
        teamId: "QQ57RJ5UTD",

        // TODO: Move into the plugin
        ...require(configPath),
        directory: path.relative(process.cwd(), path.dirname(configPath)),
      },
    ]),

    // Ensure this runs last
    require("./target-plugin/withWidget").withXcodeProjectBetaBaseMod,
  ],
});
