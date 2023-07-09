//
//  DeviceActivityMonitorExtension.swift
//  ActivityMonitorExtension
//
//  Created by Robert Herber on 2023-07-05.
//

import DeviceActivity
import ManagedSettings
import Foundation
import os

// Optionally override any of the functions below.
// Make sure that your class name matches the NSExtensionPrincipalClass in your Info.plist.
@available(iOS 15.0, *)
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  let notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()
  
  func sendNotification(name: String){
    let notificationName = CFNotificationName(name as CFString)

     CFNotificationCenterPostNotification(notificationCenter, notificationName, nil, nil, false)
  }
  
    override func intervalDidStart(for activity: DeviceActivityName) {
      super.intervalDidStart(for: activity)
      
      self.sendNotification(name: "intervalDidStart")
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
      super.intervalDidEnd(for: activity)
      

      self.sendNotification(name: "intervalDidEnd")
    }
    
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
      super.eventDidReachThreshold(event, activity: activity)
      
      let userDefaults = UserDefaults(suiteName: "group.ActivityMonitor")
      let now = (Date().timeIntervalSince1970 * 1000).rounded()
      userDefaults?.set(now, forKey: "activity_event_last_called_\(event.rawValue)")
      
      let notificationName = CFNotificationName("com.notification.name" as CFString)
      let notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()

      CFNotificationCenterPostNotification(notificationCenter, notificationName, nil, nil, false)
        
      self.sendNotification(name: "eventDidReachThreshold")
    }
    
    override func intervalWillStartWarning(for activity: DeviceActivityName) {
      super.intervalWillStartWarning(for: activity)
        
      self.sendNotification(name: "intervalWillStartWarning")
    }
    
    override func intervalWillEndWarning(for activity: DeviceActivityName) {
      super.intervalWillEndWarning(for: activity)
        
      self.sendNotification(name: "intervalWillEndWarning")
    }
    
    override func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
      super.eventWillReachThresholdWarning(event, activity: activity)
      
      self.sendNotification(name: "eventWillReachThresholdWarning")
    }
  
}
