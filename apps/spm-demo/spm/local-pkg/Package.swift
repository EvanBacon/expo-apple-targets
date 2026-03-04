// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LocalSPM",
    platforms: [.iOS(.v15)],
    products: [.library(name: "LocalSPM", targets: ["LocalSPM"])],
    targets: [.target(name: "LocalSPM")]
)
