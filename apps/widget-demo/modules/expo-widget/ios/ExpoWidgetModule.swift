import ExpoModulesCore
import WidgetKit
import ActivityKit

public class ExpoWidgetModule: Module {
  public func definition() -> ModuleDefinition {
      var activitiesEnabled: Bool {
          get {
              if #available(iOS 16.2, *) {
                  return ActivityAuthorizationInfo().areActivitiesEnabled
              } else {
                  return false
              }
          }
      }
      var frequentPushesEnabled: Bool {
          get {
              if #available(iOS 16.2, *) {
                  return ActivityAuthorizationInfo().frequentPushesEnabled
              } else {
                  return false
              }
          }
      }
      
      
    Name("ExpoWidget")

      Constants([
        "activitiesEnabled": activitiesEnabled,
        "frequentPushesEnabled": frequentPushesEnabled
      ])
      
    
      
    Function("set") { (key: String, value: String, group: String?) in
      let userDefaults = UserDefaults(suiteName: group)
      userDefaults?.set(value, forKey: key)
        
      WidgetCenter.shared.reloadAllTimelines()
    }
      
      Function("isActivityInProgress") { () -> Bool in
                if #available(iOS 16.2, *) {
                    let currentActivities = Activity<OrderTrackingActivityAttributes>.activities
                    
                    // Check if any activity is in progress
                    return !currentActivities.isEmpty
                } else {
                    return false
                }
            }
            
            Function("startActivity") { (trackingNumber: String, carrierName: String, packageStatus: OrderTrackingActivityAttributes.PackageStatus, estimatedDeliveryTime: UInt64) -> Bool in
                if #available(iOS 16.2, *) {
                    let attributes = OrderTrackingActivityAttributes(
                        trackingNumber: trackingNumber,
                        carrierName: carrierName
                    )
                    let contentState = OrderTrackingActivityAttributes.ContentState(
                        packageStatus: packageStatus,
                        estimatedDeliveryTime: Date(timeIntervalSince1970: TimeInterval(estimatedDeliveryTime))
                    )
                    let activityContent = ActivityContent(state: contentState, staleDate: nil)
                    do {
                        let activity = try Activity.request(attributes: attributes, content: activityContent)
                        NotificationCenter.default.addObserver(self, selector: #selector(self.onOrderCancelEvent), name: Notification.Name("onOrderCancelEvent"), object: nil)
                        return true
                    } catch (let error) {
                        
                        return false
                    }
                } else {
                    return false
                }
                
            }
            
            Function("updateActivity") { (packageStatus: OrderTrackingActivityAttributes.PackageStatus, estimatedDeliveryTime: UInt64) -> Void in
                
                if #available(iOS 16.2, *) {
                    
                    let updatedContentState = OrderTrackingActivityAttributes.ContentState(
                        packageStatus: packageStatus,
                        estimatedDeliveryTime: Date(timeIntervalSince1970: TimeInterval(estimatedDeliveryTime))
                    )
                    
                    Task {
                        for activity in Activity<OrderTrackingActivityAttributes>.activities {
                            await activity.update(using: updatedContentState)
                        }
                    }
                }
            }
            
            Function("endActivity") { (packageStatus: OrderTrackingActivityAttributes.PackageStatus, estimatedDeliveryTime: UInt64) -> Void in
                
                if #available(iOS 16.2, *) {
                    let contentState = OrderTrackingActivityAttributes.ContentState(
                        packageStatus: packageStatus,
                        estimatedDeliveryTime: Date(timeIntervalSince1970: TimeInterval(estimatedDeliveryTime))
                    )
                    let finalContent = ActivityContent(state: contentState, staleDate: nil)
                    
                    Task {
                        for activity in Activity<OrderTrackingActivityAttributes>.activities {
                            await activity.end(finalContent, dismissalPolicy: .default)
                        }
                    }
                    NotificationCenter.default.removeObserver(self, name: Notification.Name("onOrderCancelEvent"), object: nil)
                }
            }
        }
        
        @objc
        func onOrderCancelEvent() {
            os_log("onOrderCancelEvent", log: OSLog.default, type: .info)
            sendEvent("onOrderCancelEvent", [
                "status": OrderTrackingActivityAttributes.PackageStatus.cancelled.rawValue
            ])
        }
        
    
}
