//
//  BrowserSelectorView.swift
//  NativeFoundationModels
//
//  Created by Sash Zats on 7/2/25.
//

import SwiftUI
import AppKit
import Combine

enum Browser: String, CaseIterable {
    case safari = "Safari"
    case chrome = "Chrome"
    case edge = "Microsoft Edge"
    case brave = "Brave"
    case arc = "Arc"
    case dia = "Dia"
    case vivaldi = "Vivaldi"
    case firefox = "Firefox"
    
    var bundleIdentifier: String {
        switch self {
        case .safari: return "com.apple.Safari"
        case .chrome: return "com.google.Chrome"
        case .edge: return "com.microsoft.edgemac"
        case .brave: return "com.brave.Browser"
        case .arc: return "company.thebrowser.Browser"
        case .dia: return "company.thebrowser.dia"
        case .vivaldi: return "com.vivaldi.Vivaldi"
        case .firefox: return "org.mozilla.firefox"
        }
    }
    
    var icon: NSImage? {
        guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleIdentifier) else {
            return nil
        }
        return NSWorkspace.shared.icon(forFile: url.path)
    }
    
    var displayName: String {
        return rawValue
    }
    
    var isInstalled: Bool {
        return NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleIdentifier) != nil
    }
    
    var supportsExtensions: Bool {
        switch self {
        case .safari, .chrome, .edge, .brave, .arc, .vivaldi, .dia:
            return true
        case .firefox:
            return false
        }
    }
}

struct BrowserSelectorView: View {
    @StateObject private var browserDetector = BrowserDetector()
    @Binding var selectedBrowser: Browser?
    var animationNamespace: Namespace.ID
    let onContinue: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Select Your Browser")
                    .font(.title2.bold())
                    .foregroundColor(.white)
            }
            .padding(.top, 20)
            
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(browserDetector.sortedBrowsers, id: \.self) { browser in
                        BrowserRow(
                            browser: browser,
                            isDefault: browser == browserDetector.defaultBrowser,
                            animationNamespace: animationNamespace,
                            onSelect: {
                                selectedBrowser = browser
                                onContinue()
                            }
                        )
                    }
                }
                .task {
                    selectedBrowser = browserDetector.defaultBrowser
                }
            }
            .frame(maxHeight: 400)
        }
    }
}

struct BrowserRow: View {
    let browser: Browser
    let isDefault: Bool
    var animationNamespace: Namespace.ID
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 8) {
                if let icon = browser.icon {
                    Image(nsImage: icon)
                        .resizable()
                        .matchedGeometryEffect(id: "browserIcon-\(browser.rawValue)", in: animationNamespace)
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 40, height: 40)
                } else {
                    Image(systemName: "globe")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.7))
                        .frame(width: 40, height: 40)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(browser.displayName)
                            .font(.title3.weight(.medium))
                            .foregroundColor(.white)
                        
                        if isDefault {
                            Text("DEFAULT")
                                .font(.caption2.bold())
                                .foregroundColor(Color(hex: "667eea"))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule()
                                        .fill(Color.white.opacity(0.9))
                                )
                        }
                        
                        Spacer()
                    }
                    
                    if !browser.supportsExtensions {
                        Text("Extensions not supported")
                            .font(.caption)
                            .foregroundColor(.red.opacity(0.8))
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.white.opacity(0.2), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
        .focusable(false)
        .disabled(!browser.supportsExtensions)
        .opacity(browser.supportsExtensions ? 1.0 : 0.5)
    }
}

class BrowserDetector: ObservableObject {
    @Published var installedBrowsers: [Browser] = []
    @Published var defaultBrowser: Browser?
    @Published var sortedBrowsers: [Browser] = []
    
    init() {
        detectBrowsers()
    }
    
    private func detectBrowsers() {
        installedBrowsers = Browser.allCases.filter { $0.isInstalled }
        
        if let defaultBrowserURL = NSWorkspace.shared.urlForApplication(toOpen: URL(string: "https://example.com")!),
           let bundleID = Bundle(url: defaultBrowserURL)?.bundleIdentifier,
           let browser = Browser.allCases.first(where: { $0.bundleIdentifier == bundleID }) {
            defaultBrowser = browser
        }
        
        sortBrowsers()
    }
    
    private func sortBrowsers() {
        sortedBrowsers = installedBrowsers.sorted { browser1, browser2 in
            if browser1 == defaultBrowser { return true }
            if browser2 == defaultBrowser { return false }
            
            let supportedOrder: [Browser] = [.safari, .chrome, .edge, .brave, .arc, .vivaldi, .firefox]
            let index1 = supportedOrder.firstIndex(of: browser1) ?? Int.max
            let index2 = supportedOrder.firstIndex(of: browser2) ?? Int.max
            
            return index1 < index2
        }
    }
}
