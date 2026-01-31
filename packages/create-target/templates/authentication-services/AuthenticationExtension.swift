import AuthenticationServices

class AuthenticationExtension: NSObject, ASAuthorizationProviderExtensionAuthorizationRequestHandler {

    func beginAuthorization(with request: ASAuthorizationProviderExtensionAuthorizationRequest) {
        request.doNotHandle()
    }
}
