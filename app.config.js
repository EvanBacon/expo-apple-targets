require("ts-node/register");

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [
      require("./target-plugin").withTargetsDir,
      {
        appleTeamId: "QQ57RJ5UTD",
        // match: "watch-app",
      },
    ],
  ],
});
