//
//  AuthenticationViewController.swift
//  fx-authentication
//
//  Created by Evan Bacon on 12/3/23.
//

import UIKit
import AuthenticationServices

class AuthenticationViewController: UIViewController {

    var authorizationRequest: ASAuthorizationProviderExtensionAuthorizationRequest?

    override func loadView() {
        super.loadView()
        // Do any additional setup after loading the view.
    }

    override var nibName: String? {
        return "AuthenticationViewController"
    }
}

extension AuthenticationViewController: ASAuthorizationProviderExtensionAuthorizationRequestHandler {
    
    public func beginAuthorization(with request: ASAuthorizationProviderExtensionAuthorizationRequest) {
        self.authorizationRequest = request

        // Call this to indicate immediate authorization succeeded.
        let authorizationHeaders = [String: String]() // TODO: Fill in appropriate authorization headers.
        request.complete(httpAuthorizationHeaders: authorizationHeaders)
       
        // Or present authorization view and call self.authorizationRequest.complete() later after handling interactive authorization.
        // request.presentAuthorizationViewController(completion: { (success, error) in
        //     if error != nil {
        //         request.complete(error: error!)
        //     }
        // })
    }
}
