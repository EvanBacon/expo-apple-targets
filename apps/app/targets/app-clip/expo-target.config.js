/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "clip",
  icon: "../../assets/icon.png",
  colors: {
    $accent: "darkcyan",
  },
  entitlements: {
    "com.apple.developer.parent-application-identifiers": [
      "$(AppIdentifierPrefix)com.bacon.2095",
    ],
  },
};
