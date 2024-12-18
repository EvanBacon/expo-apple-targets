//
//  ReactNativeView.swift
//  sharedemo
//
//  Created by Evan Bacon on 12/18/24.
//

import UIKit
import React
import ExpoModulesCore

class ReactNativeView: UIView {

    private var bridge: RCTBridge?
    private var reactRootView: RCTRootView?

    init(frame: CGRect, moduleName: String = "main", initialProps: [String: Any] = [:]) {
        super.init(frame: frame)
        setupReactNativeView(moduleName: moduleName, initialProps: initialProps)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupReactNativeView(moduleName: "main", initialProps: [:])
    }

    private func setupReactNativeView(moduleName: String, initialProps: [String: Any]) {
        // Set up the React Native bridge
        #if DEBUG
        let jsCodeLocation = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
        #else
        let jsCodeLocation = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif

        guard let jsCodeLocation = jsCodeLocation else {
            fatalError("Unable to find JavaScript bundle")
        }

        self.bridge = RCTBridge(bundleURL: jsCodeLocation, moduleProvider: nil, launchOptions: nil)

        // Create the React Root View
        guard let bridge = self.bridge else {
            fatalError("React bridge initialization failed")
        }
        self.reactRootView = RCTRootView(bridge: bridge, moduleName: moduleName, initialProperties: initialProps)

        // Embed the React Native view
        if let reactRootView = self.reactRootView {
            reactRootView.frame = self.bounds
            reactRootView.backgroundColor = .clear
            reactRootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            self.addSubview(reactRootView)
        }
    }
}
