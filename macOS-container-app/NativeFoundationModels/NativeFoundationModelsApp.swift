//
//  NativeFoundationModelsApp.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI
import Foundation
import Combine
import CryptoKit
#if os(macOS)
import Sparkle
#endif
import SafariServices

#if os(macOS)
class AppDelegate: NSObject, NSApplicationDelegate {
    fileprivate let updaterController: SPUStandardUpdaterController
    
    override init() {
        updaterController = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)
        super.init()
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Check for updates silently on app startup
        updaterController.updater.checkForUpdatesInBackground()
        DispatchQueue.main.async {
            AppMover.moveIfNecessary()
        }
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}
#endif


@main
struct NativeFoundationModelsApp: App {
    #if os(macOS)
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    #endif
    
    init() {}
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
#if os(macOS)
                    NSApplication.shared.windows.forEach { window in
                        window.titlebarAppearsTransparent = true
                        window.titleVisibility = .hidden
                        window.styleMask.insert(.fullSizeContentView)
                        window.isMovableByWindowBackground = true
                    }
#endif
                }
        }
#if os(macOS)
        .windowResizability(.contentSize)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) { }
            CommandGroup(after: .appInfo) {
                CheckForUpdatesView(updater: appDelegate.updaterController.updater)
            }
        }
#else
        .windowResizability(.contentSize)
#endif
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

#if os(macOS)
class InstallationStepManager: ObservableObject {
    @Published var stepStatuses: [InstallationStep: Bool] = [:]
    @Published var stepInProgress: [InstallationStep: Bool] = [:]
    @Published var selectedBrowser: Browser? {
        didSet {
            if selectedBrowser != oldValue {
                checkAllSteps()
                // Trigger auto-install when browser changes
                if autoInstallEnabled {
                    Task {
                        if let browser = selectedBrowser {
                            await checkAndInstallComponents(for: browser)
                        }
                    }
                }
            }
        }
    }
    @Published var autoInstallEnabled: Bool = true
    
    private let binaryName = "nativefoundationmodels-native"
    private var extensionId: String {
        ProcessInfo.processInfo.environment["GOOGLE_CHROME_EXTENSION_ID"] ?? "jjmocainopehgedhgjpanckkalhiodmj"
    }
    private let safariExtensionBundleIdentifier = "com.zats.NativeFoundationModels.SafariExtension"
    private var monitoringTimer: Timer?
    private var hasPerformedAutoInstall = false
    
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
        
        // Perform auto-install check after a brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.performAutoInstallIfNeeded()
        }
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
    
    /// Performs automatic installation/update if needed
    func performAutoInstallIfNeeded() {
        guard autoInstallEnabled && !hasPerformedAutoInstall else { return }
        hasPerformedAutoInstall = true
        
        guard let browser = selectedBrowser else {
            // No browser selected yet, will retry when browser is selected
            return
        }
        
        Task {
            await checkAndInstallComponents(for: browser)
        }
    }
    
    /// Checks if components need installation/update and performs them automatically
    private func checkAndInstallComponents(for browser: Browser) async {
        // Skip Safari as it doesn't need binary components
        if browser == .safari {
            return
        }
        
        let needsBinaryUpdate = await needsBinaryUpdate()
        let needsBinaryInstall = !isBinaryInstalled() || needsBinaryUpdate
        let needsHostUpdate = await needsHostUpdate()
        let needsHostInstall = !isNativeMessagingHostInstalled() || needsHostUpdate
        
        if needsBinaryInstall || needsHostInstall {
            DispatchQueue.main.async {
                self.stepInProgress[.installBinary] = true
            }
            
            do {
                if needsBinaryInstall {
                    try await installBinary()
                }
                if needsHostInstall {
                    try await installNativeMessagingHost()
                }
                
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
    
    /// Checks if the installed binary needs to be updated based on hash comparison
    private func needsBinaryUpdate() async -> Bool {
        guard isBinaryInstalled(),
              let bundledBinaryURL = Bundle.main.url(forResource: binaryName, withExtension: nil) else {
            return false
        }
        
        let installedHash = await computeFileHash(at: binaryURL)
        let bundledHash = await computeFileHash(at: bundledBinaryURL)
        
        return installedHash != bundledHash
    }
    
    /// Checks if the native messaging host configuration needs to be updated
    private func needsHostUpdate() async -> Bool {
        guard let browser = selectedBrowser,
              let hostURL = nativeMessagingHostURL(for: browser),
              FileManager.default.fileExists(atPath: hostURL.path) else {
            return false
        }
        
        // Read the current host configuration
        do {
            let currentConfig = try String(contentsOf: hostURL)
            let expectedConfig = generateHostConfiguration()
            return currentConfig.trimmingCharacters(in: .whitespacesAndNewlines) != expectedConfig.trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            // If we can't read the file, assume it needs update
            return true
        }
    }
    
    /// Computes SHA256 hash of a file
    private func computeFileHash(at url: URL) async -> String? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .background).async {
                do {
                    let data = try Data(contentsOf: url)
                    let hash = SHA256.hash(data: data)
                    let hashString = hash.compactMap { String(format: "%02x", $0) }.joined()
                    continuation.resume(returning: hashString)
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
    
    /// Generates the expected native messaging host configuration
    private func generateHostConfiguration() -> String {
        return """
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
    
    /// Manually trigger auto-install/update process
    func triggerAutoInstall() {
        guard let browser = selectedBrowser else { return }
        Task {
            await checkAndInstallComponents(for: browser)
        }
    }
    
    /// Check if auto-install would do anything (for UI feedback)
    func wouldAutoInstallDoAnything() async -> Bool {
        guard let browser = selectedBrowser, browser != .safari else { return false }
        
        let needsBinaryUpdate = await needsBinaryUpdate()
        let needsBinaryInstall = !isBinaryInstalled() || needsBinaryUpdate
        let needsHostUpdate = await needsHostUpdate()
        let needsHostInstall = !isNativeMessagingHostInstalled() || needsHostUpdate
        
        return needsBinaryInstall || needsHostInstall
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
        let hostConfigJSON = generateHostConfiguration()
        try hostConfigJSON.write(to: hostURL, atomically: true, encoding: .utf8)
    }
    
    private func openSafariExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: safariExtensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                if let error {
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
            url = URL(string: "https://chromewebstore.google.com/detail/jjmocainopehgedhgjpanckkalhiodmj")
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
#endif

