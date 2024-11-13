// Shared with main target

import Foundation
import AppIntents
import os.log

import ActivityKit
import SwiftUI

struct OrderTrackingActivityAttributes: ActivityAttributes {
    
  public struct ContentState: Codable, Hashable {
          var packageStatus: PackageStatus
          var estimatedDeliveryTime: Date?
      }

      // Enum to represent different package statuses
      enum PackageStatus: String, Codable, Hashable, CaseIterable {
          case shipped = "Shipped"
          case inTransit = "In Transit"
          case outForDelivery = "Out for Delivery"
          case delivered = "Delivered"
          case cancelled = "Cancelled"
      }
      
      // Attributes that do not change over the activity's lifecycle
      var trackingNumber: String
      var carrierName: String
}

@available(iOS 17.0, *)
public struct CancelOrderIntent: LiveActivityIntent {
  public init() {}
    public static var title = LocalizedStringResource("Cancel Order")
    public func perform() async throws -> some IntentResult {
    os_log("CancelOrderIntent was triggered", log: OSLog.default, type: .info)
    NotificationCenter.default.post(name: Notification.Name("onOrderCancelEvent"), object: nil)
    return .result()
  }
}
