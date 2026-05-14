import Foundation
import PassKit

/// Non-UI In-App Provisioning Extension principal class.
///
/// Apple Wallet uses this handler to discover which payment passes the issuer
/// app can offer, whether authentication is required, and to provide the
/// signed `PKAddPaymentPassRequest` that Wallet uses to provision the pass.
///
/// All non-deprecated methods of `PKIssuerProvisioningExtensionHandler` must
/// be overridden without calling `super`.
///
/// References:
/// - https://developer.apple.com/documentation/passkit/pkissuerprovisioningextensionhandler
/// - https://applepaydemo.apple.com/in-app-provisioning-extensions
class IssuerProvisioningHandler: PKIssuerProvisioningExtensionHandler {

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        let status = PKIssuerProvisioningExtensionStatus()
        status.passEntriesAvailable = false
        status.remotePassEntriesAvailable = false
        status.requiresAuthentication = false
        completion(status)
    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        completion([])
    }

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        completion([])
    }

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain certificates: [Data],
        nonce: Data,
        nonceSignature: Data,
        completionHandler completion: @escaping (PKAddPaymentPassRequest?) -> Void
    ) {
        completion(nil)
    }
}
