import ReplayKit

class BroadcastSetupViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        // Customize the UI for broadcast setup
    }

    @IBAction func cancelButtonTapped(_ sender: Any) {
        userDidCancelSetup()
    }

    @IBAction func startButtonTapped(_ sender: Any) {
        userDidFinishSetup()
    }

    func userDidFinishSetup() {
        // URL of the resource where broadcast can be viewed
        let broadcastURL = URL(string: "https://example.com/broadcast")!

        // Dictionary with setup information that will be provided to the broadcast extension
        let setupInfo: [String : NSCoding & NSObjectProtocol] = ["broadcastURL": broadcastURL as NSCoding & NSObjectProtocol]

        // Tell ReplayKit that the extension is finished setting up and can begin broadcasting
        self.extensionContext?.completeRequest(withBroadcast: broadcastURL, setupInfo: setupInfo)
    }

    func userDidCancelSetup() {
        let error = NSError(domain: "com.example.broadcast", code: -1, userInfo: nil)
        self.extensionContext?.cancelRequest(withError: error)
    }
}
