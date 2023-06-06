export const WIDGET = `
import WidgetKit
import SwiftUI
import Intents

struct Provider: IntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationIntent())
    }

    func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), configuration: configuration)
        completion(entry)
    }

    func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationIntent
}

struct alphaEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        Text(entry.date, style: .time)
    }
}

struct alpha: Widget {
    let kind: String = "alpha"

    var body: some WidgetConfiguration {
        IntentConfiguration(kind: kind, intent: ConfigurationIntent.self, provider: Provider()) { entry in
            alphaEntryView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("This is an example widget.")
    }
}

struct alpha_Previews: PreviewProvider {
    static var previews: some View {
        alphaEntryView(entry: SimpleEntry(date: Date(), configuration: ConfigurationIntent()))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
`;

export const ENTRY_FILE = `import WidgetKit
import SwiftUI

@main
struct widgetBundle: WidgetBundle {
    var body: some Widget {
        // Export widgets here
    }
}
`;

export const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>
`;

export const INTENT_DEFINITION = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>INEnums</key>
	<array/>
	<key>INIntentDefinitionModelVersion</key>
	<string>1.2</string>
	<key>INIntentDefinitionNamespace</key>
	<string>88xZPY</string>
	<key>INIntentDefinitionSystemVersion</key>
	<string>20A294</string>
	<key>INIntentDefinitionToolsBuildVersion</key>
	<string>12A6144</string>
	<key>INIntentDefinitionToolsVersion</key>
	<string>12.0</string>
	<key>INIntents</key>
	<array>
		<dict>
			<key>INIntentCategory</key>
			<string>information</string>
			<key>INIntentDescriptionID</key>
			<string>tVvJ9c</string>
			<key>INIntentEligibleForWidgets</key>
			<true/>
			<key>INIntentIneligibleForSuggestions</key>
			<true/>
			<key>INIntentName</key>
			<string>Configuration</string>
			<key>INIntentResponse</key>
			<dict>
				<key>INIntentResponseCodes</key>
				<array>
					<dict>
						<key>INIntentResponseCodeName</key>
						<string>success</string>
						<key>INIntentResponseCodeSuccess</key>
						<true/>
					</dict>
					<dict>
						<key>INIntentResponseCodeName</key>
						<string>failure</string>
					</dict>
				</array>
			</dict>
			<key>INIntentTitle</key>
			<string>Configuration</string>
			<key>INIntentTitleID</key>
			<string>gpCwrM</string>
			<key>INIntentType</key>
			<string>Custom</string>
			<key>INIntentVerb</key>
			<string>View</string>
		</dict>
	</array>
	<key>INTypes</key>
	<array/>
</dict>
</plist>
`;
