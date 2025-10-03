import UIKit
import SwiftUI

class KeyboardViewController: UIInputViewController {
    
    private var keyboardView: UIView?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Setup the custom keyboard UI
        setupKeyboardUI()
    }
    
    private func setupKeyboardUI() {
        // Create and setup the SwiftUI keyboard view
        let customKeyboardView = CustomKeyboardView(viewController: self)
        let hostingController = UIHostingController(rootView: customKeyboardView)
        
        addChild(hostingController)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hostingController.view)
        
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        hostingController.didMove(toParent: self)
    }
}

struct CustomKeyboardView: View {
    weak var viewController: UIInputViewController?
    
    init(viewController: UIInputViewController) {
        self.viewController = viewController
    }
    
    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 5) {
                KeyButton(text: "Q") { insertText("Q") }
                KeyButton(text: "W") { insertText("W") }
                KeyButton(text: "E") { insertText("E") }
                KeyButton(text: "R") { insertText("R") }
                KeyButton(text: "T") { insertText("T") }
            }
            // Add more rows of keys as needed
            
            HStack {
                KeyButton(text: "Space") { insertText(" ") }
                    .frame(maxWidth: .infinity)
                KeyButton(text: "⌫") { deleteBackward() }
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
    
    private func insertText(_ text: String) {
        viewController?.textDocumentProxy.insertText(text)
    }
    
    private func deleteBackward() {
        viewController?.textDocumentProxy.deleteBackward()
    }
}

struct KeyButton: View {
    let text: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.system(size: 20))
                .frame(minWidth: 30, minHeight: 40)
                .background(Color(.systemGray5))
                .cornerRadius(5)
        }
    }
}