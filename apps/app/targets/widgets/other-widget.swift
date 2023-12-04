import WidgetKit
import SwiftUI

struct GradientProgressWidgetProvider: TimelineProvider {
    typealias Entry = SimpleEntry2

    func placeholder(in context: Context) -> SimpleEntry2 {
      SimpleEntry2(date: Date(), progressValue: 0.5)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry2) -> ()) {
        let entry = SimpleEntry2(date: Date(), progressValue: 0.5)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry2] = []
        // Simulate fetching progressValue
        let progressValue: Float = 0.75
        let entry = SimpleEntry2(date: Date(), progressValue: progressValue)
        entries.append(entry)
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry2: TimelineEntry {
    let date: Date
    let progressValue: Float
}

struct GradientProgressWidgetEntryView: View {
    var entry: GradientProgressWidgetProvider.Entry

    var body: some View {
        GradientProgressWidget(progressValue: entry.progressValue)
    }
}

struct GradientProgressWidget: View {
    let progressValue: Float

    var body: some View {
        ZStack {
            // Gradient Background
          LinearGradient(gradient: Gradient(colors: [Color("Color1"), Color("Color2")]), startPoint: .topLeading, endPoint: .bottomTrailing)
                .edgesIgnoringSafeArea(.all)
            
            // Inserted Text
            Text("Hello Expo")
                .font(.title)
                .foregroundColor(.white)
          
        }
    }
}

struct GradientWidget: Widget {
    let kind: String = "GradientWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GradientProgressWidgetProvider()) { entry in
            GradientProgressWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("This is an example widget.")
    }
}

struct MyWidget_Previews: PreviewProvider {
    static var previews: some View {
        GradientProgressWidgetEntryView(entry: SimpleEntry2(date: Date(), progressValue: 0.5))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
