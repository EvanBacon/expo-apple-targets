import UIKit

@UIApplicationMain
public class AppDelegate: UIResponder, UIApplicationDelegate {
  public var window: UIWindow?

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = UIViewController() // Add your root view controller here
    window?.makeKeyAndVisible()
    return true
  }
}
