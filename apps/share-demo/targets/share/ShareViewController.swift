import UIKit
import Social
import SwiftUI

class ShareViewController: UIViewController {
  private var sharedText: String = ""

  
  override func viewDidLoad() {
    super.viewDidLoad()
    // Extract the shared text from the extension context
       if let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let itemProvider = item.attachments?.first as? NSItemProvider,
          itemProvider.hasItemConformingToTypeIdentifier("public.plain-text") {
         itemProvider.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { [weak self] (string, error) in
           if let error = error {
             print("ItemProvider error: \(error)")
           }
           
           if let string = string as? String {
             DispatchQueue.main.async {
               self?.sharedText = string
               self?.setupUI()
             }
           }
         }
       } else {
         setupUI()
       }
  }
  
  func setupUI() {
    
  
    // Replace this with your React Native content or SwiftUI view
    let contentView = ReactNativeView(frame: view.frame, moduleName: "main",
                                      initialProps: [
                                        "extension": "com.apple.share-services",
                                        "bundleId": Bundle.main.bundleIdentifier!,
                                        "text": sharedText
                                      ])
    
    
    contentView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(contentView)
    
    NSLayoutConstraint.activate([
      contentView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      contentView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      contentView.topAnchor.constraint(equalTo: view.topAnchor),
      contentView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
    ])
  }
  
  // Handle dismissing the share extension
  override func loadView() {
    self.view = UIView(frame: UIScreen.main.bounds)
  }
  
  override func didReceiveMemoryWarning() {
    super.didReceiveMemoryWarning()
  }
}
