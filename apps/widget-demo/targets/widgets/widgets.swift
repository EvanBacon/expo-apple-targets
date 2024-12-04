import SwiftUI
import WidgetKit
import ActivityKit

extension View {
  func widgetBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      return containerBackground(for: .widget) {
        VStack {
          Spacer()
          ZStack {
            // Progress
            Arc(startAngle: .degrees(180), endAngle: .degrees(0))
              .stroke(
                LinearGradient(
                  colors: [.white, .white],
                  startPoint: .leading,
                  endPoint: .trailing
                )
                .opacity(0.6),
                lineWidth: 1
              )
            CircleBadge(imageName: "mecha", padding: 0, rotation: 0, badgeColor: .white)
              .offset(y: -40)
            CircleBadge(imageName: "booster", padding: 8, rotation: 24, badgeColor: .black)
              .offset(x: -105, y: 0)
            CircleBadge(imageName: "ship", padding: 8, rotation: 120, badgeColor: .black)
              .offset(x: 105, y: 0).opacity(0.8)
          }
          .frame(maxWidth: .infinity, alignment: .center)
        }
      }
    } else {
      return background {
        LinearGradient(
          gradient:
            Gradient(
              colors: [
                Color("gradient1"),
                Color("gradient2")
              ]
            ),
          startPoint: .top,
          endPoint: .bottom
        )
        .ignoresSafeArea()
      }
    }
  }
}

struct RocketLaunchAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var timeRemaining: Int
    var launchPhase: String
  }
  var launchName: String
}

struct RocketLaunchWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RocketLaunchAttributes.self) { context in
      LockScreenLiveActivityView(context: context)
        .activityBackgroundTint(Color.black)
        .activitySystemActionForegroundColor(Color.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          LockScreenLiveActivityView(context: context)
        }
      } compactLeading: {
        Label {
          Text(context.state.timeRemaining.formatted())
        } icon: {
          Image(systemName: "rocket.fill")
        }
      } compactTrailing: {
        Text("T-\(context.state.timeRemaining)m")
      } minimal: {
        Image(systemName: "rocket.fill")
      }
    }
  }
}

struct LockScreenLiveActivityView: View {
  @State private var timeRemaining: Int
  @State private var timer: Timer?
  let context: ActivityViewContext<RocketLaunchAttributes>?
  
  init(context: ActivityViewContext<RocketLaunchAttributes>? = nil) {
    self.context = context
    _timeRemaining = State(initialValue: context?.state.timeRemaining ?? 0)
    startTimer()
  }
  
  var body: some View {
    ZStack {
      VStack {
        HStack {
          Image("spacex")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 60, height: 20)
          Spacer()
          VStack(alignment: .trailing) {
            Text("STARSHIP")
              .font(.subheadline.bold().smallCaps())
              .monospaced()
            Text("STARLINK")
              .font(.footnote.smallCaps())
              .foregroundColor(.gray)
          }
        }
        
        Spacer()
        Text(context?.state.launchPhase ?? "BOOSTER CATCH")
          .font(.caption)
          .foregroundStyle(.secondary)
        Text("T+00:06:13s")
          .font(.title2)
          .monospaced()
          .foregroundStyle(.primary)
          .onAppear {
            startTimer()
          }
          .onDisappear {
            stopTimer()
          }
      }
    }
    .widgetBackground()
  }
  
  private var progress: Double {
    let total = 15.0
    let remaining = Double(timeRemaining)
    return 1 - (remaining / total)
  }
  
  private func startTimer() {
    timer?.invalidate()
    timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
      if timeRemaining > 0 {
        timeRemaining -= 1
      } else {
        timer?.invalidate()
      }
    }
  }
  
  private func stopTimer() {
    timer?.invalidate()
    timer = nil
  }
}

struct Arc: Shape {
  let startAngle: Angle
  let endAngle: Angle
  
  func path(in rect: CGRect) -> Path {
    var path = Path()
    let center = CGPoint(x: rect.midX, y: rect.midY * 2.5)
    let radius = min(rect.width, rect.height)
    
    path.addArc(
      center: center,
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      clockwise: false
    )
    
    return path
  }
}

struct CircleBadge: View {
  var imageName: String
  var padding: CGFloat
  var rotation: Double
  var badgeColor: Color
  
  var body: some View {
    Circle()
      .fill(badgeColor)
      .frame(width: 45, height: 45)
      .overlay(
        Image(imageName)
          .resizable()
          .renderingMode(.template)
          .foregroundColor(badgeColor == .black ? .white : .black)
          .aspectRatio(contentMode: .fit)
          .padding(padding)
          .rotationEffect(.degrees(rotation))
      )
      .overlay(
        Circle()
          .stroke(Color.white.opacity(0.5), lineWidth: 1)
      )
  }
}

// Preview Provider for development
struct RocketLaunchLiveActivityView_Previews: PreviewProvider {
  static var previews: some View {
    LockScreenLiveActivityView().previewContext(WidgetPreviewContext(family: .systemMedium))
  }
}
