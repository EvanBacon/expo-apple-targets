import Foundation

/// A simple test library for verifying local SPM package support.
public struct LocalTestPackage {
    public static let version = "1.0.0"

    public init() {}

    public func greet(name: String) -> String {
        return "Hello, \(name)!"
    }
}
