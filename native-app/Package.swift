// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NativeFoundationModelsNative",
    platforms: [
        .macOS("26.0")
    ],
    products: [
        .executable(
            name: "NativeFoundationModelsNative",
            targets: ["NativeFoundationModelsNative"]
        )
    ],
    targets: [
        .executableTarget(
            name: "NativeFoundationModelsNative",
            dependencies: [],
            path: "Sources",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency")
            ]
        )
    ]
)
