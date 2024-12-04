/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/1200px-FullMoon2010.jpg",
  colors: {
    $accent: "steelblue",
    $widgetBackground: "dodgerblue",
  },
  images: {
    spacex: "../../assets/spacex.png",
  },
  // Add entitlements for shared data with the main app.
  entitlements: {
    "com.apple.security.application-groups": ["group.bacon.data"],
  },
  // Add frameworks for live activities.
  frameworks: ["SwiftUI", "ActivityKit", "AppIntents"],

  includeInMainTarget: ["attributes.swift"],
};
