import SwiftUI
import WidgetKit
import AppIntents

@available(iOS 18.0, *)
struct WidgetToggleControl: ControlWidget {
  
  static let kind: String = "com.developer.agent.controlToggle"
  
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(
      kind: Self.kind,
      provider: Provider()
    ) { value in
      ControlWidgetToggle("Plan Mode", isOn: value, action: ToggleStateIntent()) { isOn in
        Label(value ? "ON" : "OFF", systemImage: value ? "power.circle.fill" : "power.circle")
          .controlWidgetActionHint(value ? "ON" : "OFF")
      }
      .tint(.accentColor)
    }
    .displayName("Agent Plan Mode")
    .description("Toggle the Agent Plan Mode state.")
  }
}

@available(iOS 18.0, *)
extension WidgetToggleControl {
  struct Provider: ControlValueProvider {
    var previewValue: Bool {
      false
    }
    
    func currentValue() async throws -> Bool {
      guard let userDefaults = UserDefaults(suiteName: "group.bacon.data") else { return false }
      let intValue = userDefaults.integer(forKey: "toggleState")
      return intValue == 1
    }
  }
}

@available(iOS 18.0, *)
struct ToggleStateIntent: SetValueIntent {
  static var title: LocalizedStringResource = "Toggle State"
  
  @Parameter(title: "State")
  var value: Bool
  
  func perform() async throws -> some IntentResult {
    guard let userDefaults = UserDefaults(suiteName: "group.bacon.data") else { return .result() }
    
    let intValue = userDefaults.integer(forKey: "toggleState")
    userDefaults.set(intValue == 1 ? 0 : 1, forKey: "toggleState")
    
    return .result()
  }
}
