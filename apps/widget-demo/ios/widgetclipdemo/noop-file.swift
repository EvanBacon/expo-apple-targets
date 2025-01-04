//
// @generated
// A blank Swift file must be created for native modules with Swift files to work correctly.
//
//import AppIntents
//import SwiftUI
//import WidgetKit
//
//// This must be in both targets when `openAppWhenRun = true`
//// https://developer.apple.com/forums/thread/763851
//@available(iOS 18.0, *)
//struct OpenAppIntent: ControlConfigurationIntent {
//    static let title: LocalizedStringResource = "Launch App"
//    static let openAppWhenRun: Bool = true
//    
//    @MainActor
//    func perform() async throws -> some IntentResult & OpensIntent {
//      // This is the one that actually launches the URL
//      return .result(opensIntent: OpenURLIntent(URL(string: "https://pillarvalley.netlify.app/settings")!))
//    }
//}
