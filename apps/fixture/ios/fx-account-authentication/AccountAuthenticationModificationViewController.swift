// Copyright © 2020 Apple Inc. All rights reserved.

import AuthenticationServices

class AccountAuthenticationModificationViewController: ASAccountAuthenticationModificationViewController {

/*
     Prepare your extension to convert the account with the credential for the given service identifier to
     use Sign in with Apple. If you need additional user authentication before doing the conversion and
     need to show UI, cancel the request with the ASExtensionError.userInteractionRequired error code.

    override func convertAccountToSignInWithAppleWithoutUserInteraction(for serviceIdentifier: ASCredentialServiceIdentifier, existingCredential: ASPasswordCredential, userInfo: [AnyHashable : Any]?) {
        let additionalAuthenticationRequired = false
        if additionalAuthenticationRequired {
            self.extensionContext.cancelRequest(withError: ASExtensionError(.userInteractionRequired))
        } else {
            self.extensionContext.getSignInWithAppleUpgradeAuthorization(state: nil, nonce: nil ) { authorization, error in
                guard let authorization = authorization else {
                    self.extensionContext.cancelRequest(withError: ASExtensionError(.failed))
                    return
                }

                self.extensionContext.completeUpgradeToSignInWithApple()
            }
        }
    }
*/

/*
     Implement this method if convertAccountToSignInWithAppleWithoutUserInteraction(for:existingCredential:userInfo:)
     can fail with ASExtensionError.userInteractionRequired. In this case, the system will call this method
     and then present your extension's UI. Show appropriate UI for authenticating the user and then request
     the Sign in with Apple authorization.

    override func prepareInterfaceToConvertAccountToSignInWithApple(for serviceIdentifier: ASCredentialServiceIdentifier, existingCredential: ASPasswordCredential, userInfo: [AnyHashable : Any]? = nil) {
    }
*/

/*
     Prepare your extension to change the credential for the given service identifier to use a new, strong
     password. If you need additional user authentication before doing the conversion and need to show UI,
     cancel the request with the ASExtensionError.userInteractionRequired error code.

    override func changePasswordWithoutUserInteraction(for serviceIdentifier: ASCredentialServiceIdentifier, existingCredential: ASPasswordCredential, newPassword: String, userInfo: [AnyHashable : Any]?) {
        let additionalAuthenticationRequired = false
        if additionalAuthenticationRequired {
            self.extensionContext.cancelRequest(withError: ASExtensionError(.userInteractionRequired))
        } else {
            let newCredential = ASPasswordCredential(user: existingCredential.user, password: newPassword)
            self.extensionContext.completeChangePasswordRequest(updatedCredential: newCredential)
        }
    }
*/

/*
     Implement this method if changePasswordWithoutUserInteraction(for:existingCredential:newPassword:userInfo:) can fail with
     ASExtensionError.userInteractionRequired. In this case, the system will call this method and then present
     your extension's UI. Show appropriate UI for authenticating the user and then complete the request with
     the associated ASPasswordCredential.

    override func prepareInterfaceToChangePassword(for serviceIdentifier: ASCredentialServiceIdentifier, existingCredential: ASPasswordCredential, newPassword: String, userInfo: [AnyHashable : Any]? = nil) {
    }
*/

/*
    If your extension shows UI and the user taps the system-provided "Cancel" button, your extension UI will be dismissed
    and this method will be called. The default implementation in ASAccountAuthenticationModificationController simply
    cancels the request. If you want to do any cleanup before the request is canceled, you can override this method. Be
    sure to still cancel the request with the ASExtensionError.userCanceled error code.

   override func cancelRequest() {
   }
*/


    @IBAction func completeAdditionalAuthentication(_ sender: AnyObject?) {
/*
     Sign in with Apple Conversion:

        self.extensionContext.getSignInWithAppleUpgradeAuthorization(state: self.myState(), nonce: self.myNonce() ) { authorization, error in
            guard let authorization = authorization else {
                self.extensionContext.cancelRequest(withError: ASExtensionError(.failed))
                return
            }

            self.extensionContext.completeUpgradeToSignInWithApple()
        }

     Strong Password Change:

        let newCredential = ASPasswordCredential(user: username, password: newPassword)
        self.extensionContext.completeChangePasswordRequest(updatedCredential: newCredential)
*/
    }

}

