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
                        CircleBadge()
                            .offset(y: -40) // Adjust the position as needed
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
    let context: ActivityViewContext<RocketLaunchAttributes>?
    
    init(context: ActivityViewContext<RocketLaunchAttributes>? = nil) {
        self.context = context
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
                    Text("STARSHIP")
                        .font(.subheadline.bold())
                        .monospaced()
                }
                
                Spacer()
                Text(context?.state.launchPhase ?? "BOOSTER CATCH")
                    .font(.caption)
                    .foregroundStyle(.secondary) 
                Text(context?.state.launchPhase ?? "T+00:06:13")
                    .font(.title2)
                    .monospaced()
                    .foregroundStyle(.primary)
            }
        }
        .widgetBackground()
    }
    
    private var progress: Double {
        let total = 15.0
        let remaining = Double(context?.state.timeRemaining ?? 0)
        return 1 - (remaining / total)
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
    var body: some View {
        Circle()
        .fill(Color.white)
            .frame(width: 45, height: 45)
            .overlay(
              Image(.mecha)
                .resizable()
                .renderingMode(.template)
                .foregroundColor(.black)
                .aspectRatio(contentMode: .fit)
                .padding(4)
            )
            .overlay(
                Circle()
                    .stroke(Color.black, lineWidth: 5)
            )
    }
}

// Preview Provider for development
struct RocketLaunchLiveActivityView_Previews: PreviewProvider {
    static var previews: some View {
        LockScreenLiveActivityView().previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
