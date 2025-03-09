//
//  WidgetToggleControl.swift
//  widgetclipdemo
//
//  Created by AKSHAY JADHAV on 09/03/25.
//

//
//  WidgetToggleControl.swift
//  widgetclipdemo
//

import SwiftUI
import WidgetKit
import AppIntents

@available(iOS 18.0, *)
struct WidgetToggleControl: ControlWidget {
  
  static let kind: String = "com.developer.bacon.controlToggle"
  
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(
      kind: Self.kind,
      provider: Provider()
    ) { value in
      ControlWidgetToggle("Toggle State", isOn: value, action: ToggleStateIntent()) { isOn in
        Label(value ? "ON" : "OFF", systemImage: value ? "power.circle.fill" : "power.circle")
          .controlWidgetActionHint(value ? "ON" : "OFF")
      }
      .tint(.accentColor)
    }
    .displayName("Generic Toggle Control")
    .description("Toggle a generic state.")
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
