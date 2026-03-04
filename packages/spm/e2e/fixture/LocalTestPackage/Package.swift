// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LocalTestPackage",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "LocalTestPackage",
            targets: ["LocalTestPackage"]
        ),
    ],
    targets: [
        .target(
            name: "LocalTestPackage"
        ),
    ]
)
