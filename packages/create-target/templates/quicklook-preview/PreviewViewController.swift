import UIKit
import QuickLook

class PreviewViewController: UIViewController, QLPreviewingController {

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    func preparePreviewOfFile(at url: URL, completionHandler handler: @escaping (Error?) -> Void) {
        // Add the supported content types to the QLSupportedContentTypes array in the Info.plist.
        handler(nil)
    }

    func preparePreviewOfSearchableItem(identifier: String, queryString: String?, completionHandler handler: @escaping (Error?) -> Void) {
        // Perform any setup necessary in order to prepare the view.
        handler(nil)
    }
}
