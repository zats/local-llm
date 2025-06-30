//
//  NativeFoundationModelsApp.swift
//  NativeFoundationModels
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI
import Foundation
import Combine

class AppDelegate: NSObject, NSApplicationDelegate {
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
        }
    }
    
}

class BinaryManager: ObservableObject {
    @Published var isInstalled: Bool = false
    @Published var statusMessage: String = ""
    @Published var isProcessing: Bool = false
    
    private let binaryName = "nativefoundationmodels-native"
    private var destinationURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("bin")
            .appendingPathComponent(binaryName)
    }
    
    init() {
        checkInstallationStatus()
    }
    
    func checkInstallationStatus() {
        isProcessing = true
        defer { isProcessing = false }
        
        let exists = FileManager.default.fileExists(atPath: destinationURL.path)
        
        DispatchQueue.main.async {
            self.isInstalled = exists
            if exists {
                self.statusMessage = "Binary is installed at ~/bin/\(self.binaryName)"
            } else {
                self.statusMessage = "Binary is not installed"
            }
        }
    }
    
    func installBinary() {
        guard let bundlePath = Bundle.main.url(forResource: binaryName, withExtension: nil) else {
            DispatchQueue.main.async {
                self.statusMessage = "Error: Could not find binary in app bundle"
            }
            return
        }
        
        isProcessing = true
        
        Task {
            do {
                let binDir = destinationURL.deletingLastPathComponent()
                
                // Create ~/bin directory if it doesn't exist
                try FileManager.default.createDirectory(at: binDir, withIntermediateDirectories: true)
                
                // Remove existing binary if present
                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                }
                
                // Copy the binary
                try FileManager.default.copyItem(at: bundlePath, to: destinationURL)
                
                // Make it executable
                try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: destinationURL.path)
                
                DispatchQueue.main.async {
                    self.isInstalled = true
                    self.statusMessage = "Successfully installed binary to ~/bin/\(self.binaryName)"
                    self.isProcessing = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.statusMessage = "Error installing binary: \(error.localizedDescription)"
                    self.isProcessing = false
                }
            }
        }
    }
    
    func removeBinary() {
        isProcessing = true
        
        Task {
            do {
                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                }
                
                DispatchQueue.main.async {
                    self.isInstalled = false
                    self.statusMessage = "Successfully removed binary from ~/bin/"
                    self.isProcessing = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.statusMessage = "Error removing binary: \(error.localizedDescription)"
                    self.isProcessing = false
                }
            }
        }
    }
    
    func reinstallBinary() {
        removeBinary()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.installBinary()
        }
    }
}
