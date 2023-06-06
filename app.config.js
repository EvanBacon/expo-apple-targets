require("ts-node/register");

const plugin = require("./widget-plugin/withWidget").default;
module.exports = ({ config }) => ({
  ...config,
  plugins: [plugin],
});

// module.exports = ({ config }) => config;
