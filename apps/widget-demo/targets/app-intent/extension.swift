
import Foundation
import AppIntents
import SwiftUI
import WidgetKit

@main
struct EntryExtension: AppIntentsExtension {
}


/// App intent to enable the VPN
///
/// This is used in App Shortcuts, for things like Shortcuts.app, Spotlight and Siri.
/// This is very similar to ``WidgetEnableVPNIntent``, but this runs in-app, allows continuation in the app if needed,
/// and provides a result dialog.
///
//@available(iOS 17.0, *)
//struct EnableVPNIntent: AppIntent {
//    static let title: LocalizedStringResource = "Launch Expo"
//    static let description: LocalizedStringResource = "Launch The Expo Website"
//    static let openAppWhenRun: Bool = true
//    static let isDiscoverable: Bool = true
//    static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed
//
//  @MainActor
//  func perform() async throws -> some IntentResult {
//    guard let url = URL(string: "http://expo.dev") else {
//      let error = AppIntentError.Unrecoverable(
//        reason: .invalidURL(url: "http://expo.dev")
//      )
//      return .failure(error)
//    }
//    DispatchQueue.main.async {
//      UIApplication.shared.open(url)
//    }
//    return .result()
//  }
////    @MainActor
////    func perform() async throws -> some IntentResult & ProvidesDialog {
////    
////      guard let url = URL(string: "http://expo.dev") else {
////        let error = AppIntentError.Unrecoverable(
////          reason: .invalidURL(url: "http://expo.dev")
////        )
////        return .failure(error)
////      }
////      DispatchQueue.main.async {
////        UIApplication.shared.open(url)
////      }
////      return .result()
////    }
//}


//@available(iOS 18.0, *)
//struct LaunchExpoIntent: AppIntent {
//  static let title: LocalizedStringResource = "Launch Expo"
////  static let description: LocalizedStringResource = "Launch The Expo Website"
////  static let openAppWhenRun: Bool = true
////  static let isDiscoverable: Bool = true
////  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed
//
//    func perform() async throws -> some IntentResult & OpensIntent {
//      os_log("LaunchExpoIntent called")
//        let url = URL(string: "https://expo.dev")!
////        return .openURL(url)
//        return .result(opensIntent: OpenURLIntent(url))
//    }
//}


@available(iOS 18.0, *)
struct TestWidgetControl: ControlWidget {
    
    let kind: String = "WidgetKind"
    
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: kind, content: {
            ControlWidgetButton(action: OpenTestAppIntent(), label: {
                HStack {
                    Image(systemName: "app.fill")
                    Text("Open TestApp (bacon)")
                }
            })
        })
    }
    
}


@available(iOS 18.0, *)
struct OpenTestAppIntent: AppIntent {
    
    static let title: LocalizedStringResource = "Open Expo widget (bacon)"
    
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result(
            opensIntent: OpenURLIntent(URL(string: "widgetTest1://")!)
        )
    }
    
}
