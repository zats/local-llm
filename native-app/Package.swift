// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ChromeLLMNative",
    platforms: [
        .macOS("26.0")
    ],
    products: [
        .executable(
            name: "ChromeLLMNative",
            targets: ["ChromeLLMNative"]
        )
    ],
    targets: [
        .executableTarget(
            name: "ChromeLLMNative",
            dependencies: [],
            path: "Sources",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency")
            ]
        )
    ]
)
