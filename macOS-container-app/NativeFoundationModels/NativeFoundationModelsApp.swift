//
//  NativeFoundationModelsApp.swift
//  NativeFoundationModels
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI
import Foundation
import Combine
import Sparkle

class AppDelegate: NSObject, NSApplicationDelegate {
    fileprivate let updaterController: SPUStandardUpdaterController
    
    override init() {
        updaterController = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)
        super.init()
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

@main
struct NativeFoundationModelsApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {}
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowResizability(.contentSize)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) { }
            CommandGroup(after: .appInfo) {
                CheckForUpdatesView(updater: appDelegate.updaterController.updater)
            }
        }
    }
    
}

enum InstallationStep: Int, CaseIterable {
    case installBinary = 1
    case installExtension = 2
    
    var title: String {
        switch self {
        case .installBinary:
            return "Native Compnents"
        case .installExtension:
            return "Chrome Extension"
        }
    }
    
    var description: String {
        switch self {
        case .installBinary:
            return "Installs the native binary to ~/bin and copies configuration"
        case .installExtension:
            return "Opens the Chrome Web Store to install the browser extension"
        }
    }
}

class InstallationStepManager: ObservableObject {
    @Published var stepStatuses: [InstallationStep: Bool] = [:]
    @Published var stepInProgress: [InstallationStep: Bool] = [:]
    
    private let binaryName = "nativefoundationmodels-native"
    private let extensionId = "jjmocainopehgedhgjpanckkalhiodmj"
    private var monitoringTimer: Timer?
    
    private var binaryURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("bin")
            .appendingPathComponent(binaryName)
    }
    
    private var nativeMessagingHostURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nativeFoundationModels.native.json")
    }
    
    init() {
        InstallationStep.allCases.forEach { step in
            stepStatuses[step] = false
            stepInProgress[step] = false
        }
        checkAllSteps()
        startMonitoring()
    }
    
    deinit {
        monitoringTimer?.invalidate()
    }
    
    private func startMonitoring() {
        monitoringTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            self.checkAllSteps()
        }
    }
    
    func checkAllSteps() {
        DispatchQueue.main.async {
            self.stepStatuses[.installBinary] = self.isBinaryStepComplete()
            self.stepStatuses[.installExtension] = self.isExtensionInstalled()
        }
    }
    
    private func isBinaryStepComplete() -> Bool {
        let binaryExists = FileManager.default.fileExists(atPath: binaryURL.path)
        let hostExists = FileManager.default.fileExists(atPath: nativeMessagingHostURL.path)
        return binaryExists && hostExists
    }
    
    func isBinaryInstalled() -> Bool {
        return FileManager.default.fileExists(atPath: binaryURL.path)
    }
    
    func isNativeMessagingHostInstalled() -> Bool {
        return FileManager.default.fileExists(atPath: nativeMessagingHostURL.path)
    }
    
    func revealBinaryInFinder() {
        let binDir = binaryURL.deletingLastPathComponent()
        
        if isBinaryInstalled() {
            // Reveal the specific binary file
            NSWorkspace.shared.activateFileViewerSelecting([binaryURL])
        } else {
            // Open the ~/bin directory (create if needed)
            do {
                try FileManager.default.createDirectory(at: binDir, withIntermediateDirectories: true)
                NSWorkspace.shared.open(binDir)
            } catch {
                // If can't create, just try to open home directory
                NSWorkspace.shared.open(FileManager.default.homeDirectoryForCurrentUser)
            }
        }
    }
    
    func revealNativeMessagingHostInFinder() {
        let hostDir = nativeMessagingHostURL.deletingLastPathComponent()
        
        if isNativeMessagingHostInstalled() {
            // Reveal the specific JSON file
            NSWorkspace.shared.activateFileViewerSelecting([nativeMessagingHostURL])
        } else {
            // Open the native messaging hosts directory (create if needed)
            do {
                try FileManager.default.createDirectory(at: hostDir, withIntermediateDirectories: true)
                NSWorkspace.shared.open(hostDir)
            } catch {
                NSWorkspace.shared.open(URL.applicationSupportDirectory)
            }
        }
    }
    
    private func isExtensionInstalled() -> Bool {
        let browsers = [
            "Google/Chrome/Default/Extensions",
            "Microsoft Edge/Default/Extensions", 
            "BraveSoftware/Brave-Browser/Default/Extensions",
            "Arc/User Data/Default/Extensions",
            "Vivaldi/Default/Extensions"
        ]
        
        let applicationSupport = URL.applicationSupportDirectory
        for browserPath in browsers {
            let extensionPath = applicationSupport
                .appendingPathComponent(browserPath)
                .appendingPathComponent(extensionId)
            
            if FileManager.default.fileExists(atPath: extensionPath.path) {
                return true
            }
        }
        
        return false
    }
    
    func executeStep(_ step: InstallationStep) {
        guard !stepStatuses[step, default: false] else { return }
        
        stepInProgress[step] = true
        
        switch step {
        case .installBinary:
            installBinaryAndHost()
        case .installExtension:
            openExtensionStore()
        }
    }
    
    private func installBinaryAndHost() {
        Task {
            do {
                try await installBinary()
                try await installNativeMessagingHost()
                
                DispatchQueue.main.async {
                    self.stepInProgress[.installBinary] = false
                    self.checkAllSteps()
                }
            } catch {
                DispatchQueue.main.async {
                    self.stepInProgress[.installBinary] = false
                }
            }
        }
    }
    
    private func installBinary() async throws {
        guard let bundlePath = Bundle.main.url(forResource: binaryName, withExtension: nil) else {
            throw NSError(domain: "InstallationError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Binary not found in bundle"])
        }
        
        let binDir = binaryURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: binDir, withIntermediateDirectories: true)
        
        if FileManager.default.fileExists(atPath: binaryURL.path) {
            try FileManager.default.removeItem(at: binaryURL)
        }
        
        try FileManager.default.copyItem(at: bundlePath, to: binaryURL)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: binaryURL.path)
    }
    
    private func installNativeMessagingHost() async throws {
        let hostDir = nativeMessagingHostURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: hostDir, withIntermediateDirectories: true)
        
        // Generate clean native messaging host configuration
        let hostConfigJSON = """
{
  "name": "com.nativefoundationmodels.native",
  "description": "NativeFoundationModels Native Messaging Host",
  "path": "\(binaryURL.path)",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://\(extensionId)/"
  ]
}
"""
        try hostConfigJSON.write(to: nativeMessagingHostURL, atomically: true, encoding: .utf8)
    }
    
    private func openExtensionStore() {
        let url = URL(string: "https://chromewebstore.google.com/detail/native-foundation-models/jjmocainopehgedhgjpanckkalhiodmj")!
        NSWorkspace.shared.open(url)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.stepInProgress[.installExtension] = false
        }
    }
}
