import WidgetKit
import SwiftUI

struct WatchWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: WatchWidgetConfigurationIntent())
    }

    func snapshot(for configuration: WatchWidgetConfigurationIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: configuration)
    }
    
    func timeline(for configuration: WatchWidgetConfigurationIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration)
            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: WatchWidgetConfigurationIntent
}

struct WatchWidgetEntryView : View {
    var entry: WatchWidgetProvider.Entry

    var body: some View {
        VStack {
            Text("Time:")
                .font(.caption2)
            Text(entry.date, style: .time)
                .font(.caption)

            Text("Emoji:")
                .font(.caption2)
            Text(entry.configuration.favoriteEmoji)
                .font(.title3)
        }
        .padding(4)
    }
}

struct WatchWidget: Widget {
    let kind: String = "WatchWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: WatchWidgetConfigurationIntent.self, provider: WatchWidgetProvider()) { entry in
            WatchWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Watch Widget")
        .description("A simple widget for Apple Watch.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

extension WatchWidgetConfigurationIntent {
    fileprivate static var smiley: WatchWidgetConfigurationIntent {
        let intent = WatchWidgetConfigurationIntent()
        intent.favoriteEmoji = "😀"
        return intent
    }
    
    fileprivate static var starEyes: WatchWidgetConfigurationIntent {
        let intent = WatchWidgetConfigurationIntent()
        intent.favoriteEmoji = "🤩"
        return intent
    }
}

#Preview(as: .accessoryRectangular) {
    WatchWidget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
    SimpleEntry(date: .now, configuration: .starEyes)
}