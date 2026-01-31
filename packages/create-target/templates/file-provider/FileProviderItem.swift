import FileProvider
import UniformTypeIdentifiers

class FileProviderItem: NSObject, NSFileProviderItem {

    let itemIdentifier: NSFileProviderItemIdentifier

    init(identifier: NSFileProviderItemIdentifier) {
        self.itemIdentifier = identifier
    }

    var identifier: NSFileProviderItemIdentifier {
        return itemIdentifier
    }

    var parentItemIdentifier: NSFileProviderItemIdentifier {
        return .rootContainer
    }

    var capabilities: NSFileProviderItemCapabilities {
        return [.allowsReading, .allowsWriting, .allowsRenaming, .allowsReparenting, .allowsTrashing, .allowsDeleting]
    }

    var filename: String {
        return "Example File"
    }

    var contentType: UTType {
        return .plainText
    }
}
