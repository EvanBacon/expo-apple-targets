import UIKit
import Social
import SwiftUI

class ShareViewController: SLComposeServiceViewController {
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
  
  private var sharedText: String = "Loading..."
  
  func setupUI() {
    let contentView = ReactNativeView(frame: self.view.frame)

    view.addSubview(contentView)
    
    NSLayoutConstraint.activate([
      contentView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      contentView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      contentView.topAnchor.constraint(equalTo: view.topAnchor),
      contentView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
    ])
  }
  
  var urlString: String?
  
  override func isContentValid() -> Bool {
    // Do validation of contentText and/or NSExtensionContext attachments here
    return true
  }
  
  override func didSelectPost() {
    // This is called after the user selects Post. Do the upload of contentText and/or NSExtensionContext attachments.
    
    // Add a prefix to the text shared
    let finalText = "Here is a nice text I found: " + contentText
    
    // Post it to the service
    let outputItem = NSExtensionItem()
    let outputItems = [outputItem]
    outputItem.attributedContentText = NSAttributedString(string: finalText, attributes: nil)
    extensionContext?.completeRequest(returningItems: outputItems, completionHandler: nil)
  }
  
  override func configurationItems() -> [Any]! {
    // To add configuration options via table cells at the bottom of the sheet, return an array of SLComposeSheetConfigurationItem here.
    return []
  }
}
