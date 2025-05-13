import AppIntents

@main
struct EntryExtension: AppIntentsExtension {
}

struct myExtension: AppIntent {
    static var title: LocalizedStringResource { "my-extension" }
    
    func perform() async throws -> some IntentResult {
        return .result()
    }
}