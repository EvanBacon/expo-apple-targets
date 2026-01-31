import UIKit
import Photos
import PhotosUI

class PhotoEditingViewController: UIViewController, PHContentEditingController {

    var input: PHContentEditingInput?

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    // MARK: - PHContentEditingController

    func canHandle(_ adjustmentData: PHAdjustmentData) -> Bool {
        // Return true if the adjustment data can be handled
        return false
    }

    func startContentEditing(with contentEditingInput: PHContentEditingInput, placeholderImage: UIImage) {
        // Present content for editing
        input = contentEditingInput
    }

    func finishContentEditing(completionHandler: @escaping ((PHContentEditingOutput?) -> Void)) {
        // Update the adjustment data and render the output
        guard let input = input else {
            completionHandler(nil)
            return
        }

        let output = PHContentEditingOutput(contentEditingInput: input)
        let adjustmentData = PHAdjustmentData(
            formatIdentifier: "com.example.photo-editing",
            formatVersion: "1.0",
            data: Data()
        )
        output.adjustmentData = adjustmentData

        completionHandler(output)
    }

    var shouldShowCancelConfirmation: Bool {
        return false
    }

    func cancelContentEditing() {
        // Clean up temporary files, etc.
    }
}
