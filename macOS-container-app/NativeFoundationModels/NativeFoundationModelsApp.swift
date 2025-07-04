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
import SafariServices

class AppDelegate: NSObject, NSApplicationDelegate {
    fileprivate let updaterController: SPUStandardUpdaterController
    
    override init() {
        updaterController = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)
        super.init()
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Check for updates silently on app startup
        updaterController.updater.checkForUpdatesInBackground()
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
                .onAppear {
                    NSApplication.shared.windows.forEach { window in
                        window.titlebarAppearsTransparent = true
                        window.titleVisibility = .hidden
                        window.styleMask.insert(.fullSizeContentView)
                        window.isMovableByWindowBackground = true
                    }
                }
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
            return "Native Components"
        case .installExtension:
            return "Browser Extension"
        }
    }
    
    var description: String {
        switch self {
        case .installBinary:
            return "Installs the native binary to ~/bin and copies configuration"
        case .installExtension:
            return "Opens the extension store to install the browser extension"
        }
    }
}

class InstallationStepManager: ObservableObject {
    @Published var stepStatuses: [InstallationStep: Bool] = [:]
    @Published var stepInProgress: [InstallationStep: Bool] = [:]
    @Published var selectedBrowser: Browser?
    
    private let binaryName = "nativefoundationmodels-native"
    private let extensionId = "jjmocainopehgedhgjpanckkalhiodmj"
    private let safariExtensionBundleIdentifier = "com.zats.NativeFoundationModels.SafariExtension"
    private var monitoringTimer: Timer?
    
    private var binaryURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("bin")
            .appendingPathComponent(binaryName)
    }
    
    private func nativeMessagingHostURL(for browser: Browser) -> URL? {
        let intermediatePath: String? = switch browser {
        case .chrome, .dia, .arc:
            "Google/Chrome"
        case .edge:
            "Microsoft Edge"
        case .brave:
            "BraveSoftware/Brave-Browser"
        case .vivaldi:
            "Vivaldi"
        case .safari:
            // Safari uses a different mechanism, will be handled separately
            nil
        case .firefox:
            // Firefox uses a different path
            "Mozilla"
        }
        guard let path = intermediatePath else { return nil }
        return URL.applicationSupportDirectory
            .appendingPathComponent(path)
            .appendingPathComponent("NativeMessagingHosts")
            .appendingPathComponent("com.nativefoundationmodels.native.json")
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
            // Don't auto-complete the binary step - user should always have the option to reinstall
            // self.stepStatuses[.installBinary] = self.isBinaryStepComplete()
            self.stepStatuses[.installExtension] = self.isExtensionInstalled()
        }
    }
    
    private func isBinaryStepComplete() -> Bool {
        guard let browser = selectedBrowser else { return false }
        
        // Safari doesn't need binary or native messaging host
        if browser == .safari {
            return true
        }
        
        let binaryExists = FileManager.default.fileExists(atPath: binaryURL.path)
        
        // Check if native messaging host exists for the selected browser
        guard let hostURL = nativeMessagingHostURL(for: browser) else {
            return binaryExists
        }
        
        let hostExists = FileManager.default.fileExists(atPath: hostURL.path)
        return binaryExists && hostExists
    }
    
    func isBinaryInstalled() -> Bool {
        return FileManager.default.fileExists(atPath: binaryURL.path)
    }
    
    func isNativeMessagingHostInstalled() -> Bool {
        guard let browser = selectedBrowser,
              let hostURL = nativeMessagingHostURL(for: browser) else {
            return false
        }
        return FileManager.default.fileExists(atPath: hostURL.path)
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
        guard let browser = selectedBrowser,
              let hostURL = nativeMessagingHostURL(for: browser) else {
            return
        }
        
        let hostDir = hostURL.deletingLastPathComponent()
        
        if isNativeMessagingHostInstalled() {
            // Reveal the specific JSON file
            NSWorkspace.shared.activateFileViewerSelecting([hostURL])
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
            if selectedBrowser == .safari {
                // Safari doesn't need binary installation
                DispatchQueue.main.async {
                    self.stepInProgress[.installBinary] = false
                    self.checkAllSteps()
                }
            } else {
                installBinaryAndHost()
            }
        case .installExtension:
            if selectedBrowser == .safari {
                openSafariExtensionPreferences()
            } else {
                openExtensionStore()
            }
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
        guard let browser = selectedBrowser,
              let hostURL = nativeMessagingHostURL(for: browser) else {
            throw NSError(domain: "InstallationError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Browser not selected or not supported"])
        }
        
        let hostDir = hostURL.deletingLastPathComponent()
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
        try hostConfigJSON.write(to: hostURL, atomically: true, encoding: .utf8)
    }
    
    private func openSafariExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: safariExtensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                if let error = error {
                    print("Error opening Safari extension preferences: \(error)")
                }
                self.stepInProgress[.installExtension] = false
            }
        }
    }
    
    private func openExtensionStore() {
        guard let browser = selectedBrowser else { return }
        
        var url: URL?
        
        switch browser {
        case .chrome, .edge, .brave, .arc, .vivaldi, .dia:
            url = URL(string: "https://chromewebstore.google.com/detail/native-foundation-models/jjmocainopehgedhgjpanckkalhiodmj")
        case .safari, .firefox:
            break
        }
        
        if let url = url {
            NSWorkspace.shared.open(url)
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.stepInProgress[.installExtension] = false
        }
    }
}
