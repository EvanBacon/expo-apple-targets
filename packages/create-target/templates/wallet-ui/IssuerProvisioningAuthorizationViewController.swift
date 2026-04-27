import UIKit
import PassKit

/// UI In-App Provisioning Authorization Extension principal class.
///
/// Apple Wallet presents this view controller to authenticate the user when
/// the non-UI extension reports `requiresAuthentication = true`. The
/// `completionHandler` must be invoked with `.authorized` or `.canceled`
/// once authentication finishes.
///
/// References:
/// - https://developer.apple.com/documentation/passkit/pkissuerprovisioningextensionauthorizationproviding
/// - https://applepaydemo.apple.com/in-app-provisioning-extensions
class IssuerProvisioningAuthorizationViewController: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {

    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        // TODO: Present the issuer's authentication UI here. Once the user
        // authenticates (or cancels), invoke `completionHandler` with the
        // appropriate `PKIssuerProvisioningExtensionAuthorizationResult`.
    }

    /// Convenience helper: call this from your authentication flow on success.
    func reportAuthorized() {
        completionHandler?(.authorized)
    }

    /// Convenience helper: call this from your authentication flow on cancel/failure.
    func reportCanceled() {
        completionHandler?(.canceled)
    }
}
