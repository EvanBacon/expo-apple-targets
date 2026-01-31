import UIKit
import FileProviderUI

class FileProviderUIController: FPUIActionExtensionViewController {

    override func prepare(forAction actionIdentifier: String, itemIdentifiers: [NSFileProviderItemIdentifier]) {
        // Prepare the UI for the given action
    }

    override func prepare(forError error: Error) {
        // Present the error to the user
    }

    @IBAction func doneButtonTapped(_ sender: Any) {
        extensionContext.completeRequest()
    }

    @IBAction func cancelButtonTapped(_ sender: Any) {
        extensionContext.cancelRequest(withError: NSError(domain: FPUIErrorDomain, code: Int(FPUIExtensionErrorCode.userCancelled.rawValue)))
    }
}
