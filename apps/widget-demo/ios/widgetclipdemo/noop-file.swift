//
// @generated
// A blank Swift file must be created for native modules with Swift files to work correctly.
//
import AppIntents
import SwiftUI
import WidgetKit

// This must be in both targets when `openAppWhenRun = true`
// https://developer.apple.com/forums/thread/763851
@available(iOS 18.0, *)
struct OpenAppIntent: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Launch App"
    static let openAppWhenRun: Bool = true
    
    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        return .result(opensIntent: OpenURLIntent(URL(string: "olivetree://startplanday")!))
    }
}
