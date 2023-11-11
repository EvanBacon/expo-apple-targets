import AppIntents


// Optionally override any of the functions below.
// Make sure that your class name matches the NSExtensionPrincipalClass in your Info.plist.
@available(iOS 16.0, *)
struct AppIntentExample: AppIntent {
  static var title: LocalizedStringResource = "My App Intent"

  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some ProvidesDialog {
    return .result(dialog: "Example App Intent response")
  }
}
