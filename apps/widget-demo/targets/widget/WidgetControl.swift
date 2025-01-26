import AppIntents
import SwiftUI
import WidgetKit

//@main
//struct exportWidgets: WidgetBundle {
//    var body: some Widget {
//        widgetControl()
//    }
//}

@available(iOS 18.0, *)
struct widgetControl: ControlWidget {
    static let kind: String = "com.developer.bacon.widget"
    var body: some ControlWidgetConfiguration {
      StaticControlConfiguration(kind: Self.kind) {
        ControlWidgetButton(action: OpenAppIntent()) {
          Label("BACON1", systemImage: "laurel.leading")
        }
      }
      .displayName("OPEN BACON")
      .description("A an OPEN BACON control that runs a timer.")
    }
}

// This must be in both targets when `openAppWhenRun = true`
// https://developer.apple.com/forums/thread/763851
@available(iOS 18.0, *)
struct OpenAppIntent: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Launch App"
    static let description = IntentDescription(stringLiteral: "Launch the app!")
    static let isDiscoverable = false
    static let openAppWhenRun: Bool = true
    
    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result(opensIntent: OpenURLIntent(URL(string: "https://pillarvalley.expo.app/settings")!))
    }
}
