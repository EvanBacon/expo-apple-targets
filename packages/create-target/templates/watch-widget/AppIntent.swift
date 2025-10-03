import WidgetKit
import AppIntents

struct WatchWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Watch Widget Configuration" }
    static var description: IntentDescription { "Configure your watch widget." }

    // An example configurable parameter for watch widgets.
    @Parameter(title: "Favorite Emoji", default: "⌚")
    var favoriteEmoji: String
}