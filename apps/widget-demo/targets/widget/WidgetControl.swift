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
                Label {
                    Text("Expo Agent")
                } icon: {
                    Image("expo")
                        .symbolRenderingMode(.hierarchical)
                }
            }
        }
        .displayName("Build Anything")
        .description("Build with Expo Agent")
    }
}

@available(iOS 18.0, *)
struct OpenAppIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Expo Agent"
    static let description = IntentDescription(stringLiteral: "Open Expo Agent in browser")
    static let openAppWhenRun: Bool = false

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result(opensIntent: OpenURLIntent(URL(string: "https://agent.expo.dev")!))
    }
}
