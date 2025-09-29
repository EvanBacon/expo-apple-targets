/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "clip",
  // TODO: Name cannot be different to the folder name otherwise the cocoapod plugin will not work.
  // Need to make the target name be the folder name and have the display name be different, but this complicates other targets.
  name: "clip",
  icon: "https://github.com/expo.png",
  entitlements: {
    /* Add entitlements */
  },
});
