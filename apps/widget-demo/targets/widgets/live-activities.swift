// Based on https://github.com/akshayjadhav4/live-activity-rn-demo/blob/main/targets/widgets/OrderTrackingActivity.swift
// Activity Widget Extension - DeliveryLiveActivity.swift
import WidgetKit
import SwiftUI
import ActivityKit

enum StatusState {
  case completed
  case active
  case incomplete
}

private func symbolForStatus(_ status: OrderTrackingActivityAttributes.PackageStatus) -> String {
  switch status {
  case .shipped:
    return "shippingbox"
  case .inTransit:
    return "arrow.right"
  case .outForDelivery:
    return "car"
  case .delivered:
    return "house.fill"
  case .cancelled:
    return "xmark.circle"
  }
}

struct ProgressStepView: View {
  let currentStatus: OrderTrackingActivityAttributes.PackageStatus
  
  var body: some View {
    HStack(spacing: 10) {
      ForEach(OrderTrackingActivityAttributes.PackageStatus.allCases, id: \.self) { status in
        let state = calculateState(for: status, currentStatus: currentStatus) // Calculate state for each status
        
        if status != .cancelled {
          Image(systemName: symbolForStatus(status))
            .font(.subheadline)
            .foregroundColor(iconColor(for: state))
        }
        
        if status != .delivered && status != .cancelled {
          ProgressView(value: progressValue(for: state))
            .progressViewStyle(LinearProgressViewStyle(tint: progressColor(for: state)))
            .frame(height: 4)
        }
      }
    }
    .padding(.vertical)
  }
  
  // Helper function to calculate state based on current status
  private func calculateState(for status: OrderTrackingActivityAttributes.PackageStatus, currentStatus: OrderTrackingActivityAttributes.PackageStatus) -> StatusState {
    let currentStatusIndex = OrderTrackingActivityAttributes.PackageStatus.allCases.firstIndex(of: currentStatus) ?? 0
    let statusIndex = OrderTrackingActivityAttributes.PackageStatus.allCases.firstIndex(of: status) ?? 0
    if statusIndex == currentStatusIndex {
      return .active
    } else if statusIndex < currentStatusIndex {
      return .completed
    } else {
      return .incomplete
    }
  }
  
  // Colors based on progress state
  private func iconColor(for state: StatusState) -> Color {
    switch state {
    case .completed: return Color("completedState")
    case .active: return Color("activeState")
    case .incomplete: return Color("incompleteState")
    }
  }
  
  private func progressColor(for state: StatusState) -> Color {
    switch state {
    case .completed: return Color("completedState")
    case .active: return Color("activeState")
    case .incomplete: return Color("incompleteState")
    }
  }
  
  
  private func progressValue(for state: StatusState) -> Double {
    switch state {
    case .completed: return 1.0
    case .active: return 0.5
    case .incomplete: return 0.0
    }
  }
}

struct TrackingProgressView: View {
  let context: ActivityViewContext<OrderTrackingActivityAttributes>
  
  var body: some View {
    if context.state.packageStatus == OrderTrackingActivityAttributes.PackageStatus.cancelled {
      HStack(alignment: .top) {
        VStack(alignment: .leading) {
          Text("Order Cancelled.")
            .font(.headline)
            .foregroundColor(Color("primaryText"))
          
          Text("Tracking Number: \(context.attributes.trackingNumber)")
            .font(.subheadline)
            .foregroundColor(Color("secondaryText"))
        }
        .padding()
        .activityBackgroundTint(Color.black.opacity(0.5))
        Spacer()
      }
    } else {
      VStack(alignment: .leading) {
        Text("Tracking Number: \(context.attributes.trackingNumber)")
          .font(.headline)
          .foregroundColor(Color("primaryText"))
        
        Text(context.attributes.carrierName)
          .font(.subheadline)
          .foregroundColor(Color("secondaryText"))
        
        ProgressStepView(currentStatus: context.state.packageStatus)
        Text(context.state.packageStatus.rawValue)
          .font(.caption)
          .foregroundColor(Color("primaryText"))
      }
      .padding()
      .activityBackgroundTint(Color.black.opacity(0.5))
    }
  }
}

struct OrderTrackingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: OrderTrackingActivityAttributes.self) { context in
      // Lock Screen
      TrackingProgressView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        
        DynamicIslandExpandedRegion(.leading) {
          if #available(iOS 17.0, *) {
            Button(intent: CancelOrderIntent()) {
              Image(systemName: "xmark.circle")
                .foregroundColor(.red)
            }
          }
        }
        
        // Expanded view in Dynamic Island
        DynamicIslandExpandedRegion(.center) {
          VStack {
            Text(context.attributes.trackingNumber)
              .font(.subheadline)
              .foregroundColor(.gray)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          ProgressStepView(currentStatus: context.state.packageStatus)
        }
        
        
      } compactLeading: {
        Text(context.state.packageStatus.rawValue)
          .font(.subheadline)
          .foregroundColor(Color("primaryText"))
      } compactTrailing: {
        Image(systemName: symbolForStatus(context.state.packageStatus))
          .foregroundColor(Color("completedState"))
      } minimal: {
        Image(systemName: symbolForStatus(context.state.packageStatus))
          .foregroundColor(Color("completedState"))
      }
    }
  }
}


extension OrderTrackingActivityAttributes {
  fileprivate static var preview: OrderTrackingActivityAttributes {
    OrderTrackingActivityAttributes(trackingNumber: "1Z9999", carrierName: "Fast Shipping Co.")
  }
}

extension OrderTrackingActivityAttributes.ContentState {
  fileprivate static var shipped: OrderTrackingActivityAttributes.ContentState {
    OrderTrackingActivityAttributes.ContentState(packageStatus: .shipped, estimatedDeliveryTime: Date().addingTimeInterval(3600 * 5))
  }
  
  fileprivate static var inTransit: OrderTrackingActivityAttributes.ContentState {
    OrderTrackingActivityAttributes.ContentState(packageStatus: .inTransit, estimatedDeliveryTime: Date().addingTimeInterval(3600 * 3))
  }
  
  fileprivate static var outForDelivery: OrderTrackingActivityAttributes.ContentState {
    OrderTrackingActivityAttributes.ContentState(packageStatus: .outForDelivery, estimatedDeliveryTime: Date().addingTimeInterval(3600 * 1))
  }
  
  fileprivate static var delivered: OrderTrackingActivityAttributes.ContentState {
    OrderTrackingActivityAttributes.ContentState(packageStatus: .delivered, estimatedDeliveryTime: nil)
  }
}

//
//#Preview("Package Tracking Notification", as: .content, using: OrderTrackingActivityAttributes.preview) {
//  OrderTrackingLiveActivity() // Main view for the widget
//} contentStates: {
//  OrderTrackingActivityAttributes.ContentState.shipped
//  //  OrderTrackingActivityAttributes.ContentState.inTransit
//  //  OrderTrackingActivityAttributes.ContentState.outForDelivery
//  //  OrderTrackingActivityAttributes.ContentState.delivered
//}
