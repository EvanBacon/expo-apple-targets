import IdentityLookupUI

class ClassificationViewController: ILClassificationUIExtensionViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    // Customize the view by reading classification request and response
    override func prepare(for classificationRequest: ILClassificationRequest) {
        // Configure the view for the classification request
    }

    override func classificationResponse(for request: ILClassificationRequest) -> ILClassificationResponse {
        // Return a classification response for the given request
        return ILClassificationResponse(action: .none)
    }
}
