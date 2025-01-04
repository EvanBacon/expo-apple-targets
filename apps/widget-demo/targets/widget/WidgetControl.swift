import AppIntents
import SwiftUI
import WidgetKit

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
        // let url = URL(string: "com.bacon.clipdemo://test")!
        // return .result(opensIntent: OpenURLIntent(url))
        let strUrl = "olivetree://startplanday"
        UserDefaults.standard.setValue(strUrl, forKey: "StartupUrl")
        return .result(opensIntent: OpenURLIntent(URL(string: strUrl)!))
    }
}




extension widgetControl {
    struct Value {
        var isRunning: Bool
        var name: String
    }

    struct Provider: AppIntentControlValueProvider {
        func previewValue(configuration: TimerConfiguration) -> Value {
            widgetControl.Value(isRunning: false, name: configuration.timerName)
        }

        func currentValue(configuration: TimerConfiguration) async throws -> Value {
            let isRunning = true // Check if the timer is running
            return widgetControl.Value(isRunning: isRunning, name: configuration.timerName)
        }
    }
}

struct TimerConfiguration: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Timer Name Configuration"

    @Parameter(title: "Timer Name", default: "Timer")
    var timerName: String
}


struct StartTimerIntent: SetValueIntent {
    static let title: LocalizedStringResource = "Start a timer"

    @Parameter(title: "Timer Name")
    var name: String

    @Parameter(title: "Timer is running")
    var value: Bool

    init() {}

    init(_ name: String) {
        self.name = name
    }

    func perform() async throws -> some IntentResult {
        // Start the timer…
        return .result()
    }
}
