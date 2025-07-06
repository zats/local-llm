//
//  ContentView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct GradientBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Color(hex: "667eea"), Color(hex: "764ba2")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

#if os(macOS)
struct ContentView: View {
    @StateObject private var stepManager = InstallationStepManager()
    @State private var heartbeat = false
    @State private var selectedBrowser: Browser?
    @State private var showBrowserSelector = true
    @State private var showAutoInstallStatus = false
    @Namespace private var animation
    
    var filteredSteps: [InstallationStep] {
        guard let browser = stepManager.selectedBrowser else {
            return InstallationStep.allCases
        }
        
        if browser == .safari {
            // Only show extension step for Safari
            return [.installExtension]
        } else {
            return InstallationStep.allCases
        }
    }
    
    var body: some View {
        ZStack {
            GradientBackground()
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top padding for traffic lights
                Spacer()
                    .frame(height: 28)
                
                // Back button outside of toolbar to avoid macOS 26 beta crash
                if !showBrowserSelector {
                    HStack {
                        Button {
                            withAnimation(.easeInOut(duration: 0.5)) {
                                showBrowserSelector = true
                                selectedBrowser = nil
                                stepManager.selectedBrowser = nil
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 14, weight: .semibold))
                                Text("Back")
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.white.opacity(0.15))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                    )
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        .focusable(false)
                        .padding(.top, 8)
                        
                        Spacer()
                    }
                }
            
            if !showBrowserSelector, let browser = stepManager.selectedBrowser, let icon = browser.icon {
                Button(action: {
                    if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: browser.bundleIdentifier) {
                        let config = NSWorkspace.OpenConfiguration()
                        NSWorkspace.shared.openApplication(at: url, configuration: config)
                    }
                }) {
                    Image(nsImage: icon)
                        .resizable()
                        .matchedGeometryEffect(id: "browserIcon-\(browser.rawValue)", in: animation)
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 200, height: 200)
                }
                .buttonStyle(PlainButtonStyle())
                .onHover { isHovered in
                    if isHovered {
                        NSCursor.pointingHand.push()
                    } else {
                        NSCursor.pop()
                    }
                }
            }
            Image(.brain)
                .resizable()
                .offset(x: showBrowserSelector ? 0 : 60, y: showBrowserSelector ? 0: -70)
                .frame(width: showBrowserSelector ? 300 : 100, height: showBrowserSelector ? 300 : 100)
                .shadow(color: .black.opacity(0.3), radius: showBrowserSelector ? 8 : 16, y: 4)
                .scaleEffect(heartbeat ? 1.02 : 1.0)
                .animation(
                    .easeInOut(duration: 1.2)
                    .repeatForever(autoreverses: true),
                    value: heartbeat
                )
            if showBrowserSelector {
                BrowserSelectorView(selectedBrowser: $selectedBrowser, animationNamespace: animation) {
                    if let browser = selectedBrowser {
                        stepManager.selectedBrowser = browser
                        withAnimation(.easeInOut(duration: 0.5)) {
                            showBrowserSelector = false
                        }
                    }
                }
            } else {
                VStack(spacing: 16) {
                    ForEach(filteredSteps, id: \.rawValue) { step in
                        InstallationStepView(
                            step: step,
                            title: step == .installBinary || selectedBrowser == .safari ? "1" : "2",
                            isCompleted: stepManager.stepStatuses[step, default: false],
                            isInProgress: stepManager.stepInProgress[step, default: false]
                        ) {
                            stepManager.executeStep(step)
                        }
                        .environmentObject(stepManager)
                    }
                }
            }
            
                Spacer()
            }
            .padding(.horizontal, 32)
        }
        .onAppear {
            DispatchQueue.main.async {
                AppMover.moveIfNecessary()
            }
            heartbeat = true
        }
        .frame(width: 420, height: 700)
    }
}

struct InstallationStepView: View {
    let step: InstallationStep
    let title: String
    let isCompleted: Bool
    let isInProgress: Bool
    let onExecute: () -> Void
    @EnvironmentObject var stepManager: InstallationStepManager
    
    var browserSpecificTitle: String {
        guard let browser = stepManager.selectedBrowser else { return step.title }
        
        switch step {
        case .installBinary:
            if browser == .safari {
                return "Native Components"
            }
            return step.title
        case .installExtension:
            if browser == .safari {
                return "Enable Safari Extension"
            }
            return "\(browser.displayName) Extension"
        }
    }
    
    var browserSpecificDescription: String {
        guard let browser = stepManager.selectedBrowser else { return step.description }
        
        switch step {
        case .installBinary:
            if browser == .safari {
                return "Safari extensions don't require native components"
            }
            return step.description
        case .installExtension:
            if browser == .safari {
                return "Opens Safari settings to enable the extension and allow access to all websites"
            }
            return "Opens the \(browser.displayName) extension store to install the browser extension"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(backgroundColor)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.callout.bold())
                            .foregroundColor(.white)
                    } else if isInProgress {
                        ProgressView()
                            .scaleEffect(0.6)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("\(title)")
                            .font(.callout.bold())
                            .foregroundColor(.white)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(browserSpecificTitle)
                        .font(.callout.weight(.semibold))
                        .foregroundColor(.white)
                    
                    Text(browserSpecificDescription)
                        .font(.caption)
                        .foregroundColor(Color.white.opacity(0.8))
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                Spacer()
            }
            
            // Show detailed status for Native Components step
            if step == .installBinary {
                VStack(spacing: 8) {
                    ComponentStatusRow(
                        title: "Binary",
                        subtitle: "~/bin/nativefoundationmodels-native",
                        isInstalled: stepManager.isBinaryInstalled(),
                        onReveal: { stepManager.revealBinaryInFinder() }
                    )
                    
                    if let browser = stepManager.selectedBrowser {
                        ComponentStatusRow(
                            title: "Native Messaging Host (\(browser.displayName))",
                            subtitle: getNativeMessagingHostPath(for: browser),
                            isInstalled: stepManager.isNativeMessagingHostInstalled(),
                            onReveal: { stepManager.revealNativeMessagingHostInFinder() }
                        )
                    }
                }
                .padding(.leading, 44)
            }
            
            if !isCompleted {
                Button(action: onExecute) {
                    HStack(spacing: 8) {
                        if isInProgress {
                            ProgressView()
                                .scaleEffect(0.7)
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            Text("Processing...")
                        } else {
                            Image(systemName: stepIcon)
                            Text(stepButtonText)
                        }
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(
                        LinearGradient(
                            colors: [Color(hex: "667eea"), Color(hex: "764ba2")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.2), radius: 4, y: 2)
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(isInProgress)
                .focusable(false)
                .padding(.leading, 44)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 15)
                .fill(Color.white.opacity(isCompleted ? 0.1 : 0.15))
                .background(
                    RoundedRectangle(cornerRadius: 15)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
        .opacity(isCompleted ? 0.7 : 1.0)
        .animation(.easeInOut(duration: 0.3), value: isCompleted)
    }
    
    private var backgroundColor: Color {
        if isCompleted {
            return Color(hex: "2ecc71")
        } else if isInProgress {
            return Color(hex: "f39c12")
        } else {
            return Color.white.opacity(0.2)
        }
    }
    
    private var stepIcon: String {
        guard let browser = stepManager.selectedBrowser else {
            switch step {
            case .installBinary: return "terminal"
            case .installExtension: return "safari"
            }
        }
        
        switch step {
        case .installBinary:
            return browser == .safari ? "checkmark.circle" : "terminal"
        case .installExtension:
            return browser == .safari ? "gearshape" : "safari"
        }
    }
    
    private var stepButtonText: String {
        guard let browser = stepManager.selectedBrowser else {
            switch step {
            case .installBinary: return "Install"
            case .installExtension: return "Open Store"
            }
        }
        
        switch step {
        case .installBinary:
            if browser == .safari {
                return "Skip"
            }
            // Check if both components are installed
            let bothInstalled = stepManager.isBinaryInstalled() && stepManager.isNativeMessagingHostInstalled()
            return bothInstalled ? "Reinstall" : "Install"
        case .installExtension:
            return browser == .safari ? "Open Safari Settings" : "Open Store"
        }
    }
    
    private func getNativeMessagingHostPath(for browser: Browser) -> String? {
        let intermediatePath: String? = switch browser {
        case .chrome, .dia:
            "Google/Chrome"
        case .edge:
            "Microsoft Edge"
        case .brave:
            "BraveSoftware/Brave-Browser"
        case .arc:
            "Arc/User Data"
        case .vivaldi:
            "Vivaldi"
        case .safari:
            nil
        case .firefox:
            "Mozilla"
        }
        guard let intermediatePath else { return nil }
        return URL
            .applicationSupportDirectory
            .appendingPathComponent(intermediatePath)
            .appendingPathComponent("NativeMessagingHosts/com.nativefoundationmodels.native.json")
            .path
    }
}

struct ComponentStatusRow: View {
    let title: String
    let subtitle: String?
    let isInstalled: Bool
    let onReveal: () -> Void
    
    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(isInstalled ? Color(hex: "2ecc71") : Color(hex: "e74c3c"))
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption.weight(.medium))
                    .foregroundColor(.white)
                
                if let subtitle {
                    Text(subtitle)
                        .font(.caption2.monospaced())
                        .foregroundColor(Color.white.opacity(0.6))
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }
            
            Spacer()
            
            Button(action: onReveal) {
                Image(systemName: "arrow.right.circle.fill")
                    .font(.callout)
                    .foregroundColor(Color.white.opacity(0.7))
            }
            .buttonStyle(PlainButtonStyle())
            .focusable(false)
            .help(isInstalled ? "Reveal in Finder" : "Open containing folder")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        )
    }
}

// View modifier to disable focus rings
struct NoFocusRing: ViewModifier {
    func body(content: Content) -> some View {
        content
            .focusable(false)
            .onAppear {
                NSWindow.allowsAutomaticWindowTabbing = false
            }
    }
}

extension View {
    func noFocusRing() -> some View {
        modifier(NoFocusRing())
    }
}

#else
struct ContentView: View {
    @State private var heartbeat = false
    @State private var safariExtensionEnabled = false
    @State private var checkingExtension = true
    
    var body: some View {
        ZStack {
            GradientBackground()
                .ignoresSafeArea()
            
            VStack(spacing: 40) {
                // Top spacing for status bar
                Spacer()
                    .frame(height: 20)
                
                // Main brain logo
                Image(.brain)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 200, height: 200)
                    .shadow(color: .black.opacity(0.3), radius: 16, y: 8)
                    .scaleEffect(heartbeat ? 1.02 : 1.0)
                    .animation(
                        .easeInOut(duration: 1.2)
                        .repeatForever(autoreverses: true),
                        value: heartbeat
                    )
                
                // Title and description
                VStack(spacing: 16) {
                    Text("LocalLLM")
                        .font(.largeTitle.bold())
                        .foregroundColor(.white)
                    
                    Text("On-device AI for Safari")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                }
                
                // Safari extension status
                VStack(spacing: 20) {
                    if checkingExtension {
                        HStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(0.8)
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            
                            Text("Checking Safari extension...")
                                .font(.callout)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    } else {
                        SafariExtensionStatusView(
                            isEnabled: safariExtensionEnabled,
                            onEnablePressed: {
                                openSafariExtensionPreferences()
                            }
                        )
                    }
                }
                
                Spacer()
                
                // Bottom instruction text
                Text("Enable the Safari extension to start using AI features on websites")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 20)
            }
            .padding(.horizontal, 32)
        }
        .onAppear {
            heartbeat = true
            checkSafariExtensionStatus()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            // Re-check when app becomes active (user might have changed extension settings)
            checkSafariExtensionStatus()
        }
    }
    
    private func checkSafariExtensionStatus() {
        checkingExtension = true
        
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: "com.zats.NativeFoundationModels.SafariExtension") { state, error in
            DispatchQueue.main.async {
                self.checkingExtension = false
                if let state = state {
                    self.safariExtensionEnabled = state.isEnabled
                } else {
                    self.safariExtensionEnabled = false
                }
            }
        }
    }
    
    private func openSafariExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.zats.NativeFoundationModels.SafariExtension") { error in
            if let error = error {
                print("Error opening Safari extension preferences: \(error)")
            }
            // Re-check status after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.checkSafariExtensionStatus()
            }
        }
    }
}

struct SafariExtensionStatusView: View {
    let isEnabled: Bool
    let onEnablePressed: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            // Status indicator
            HStack(spacing: 12) {
                Circle()
                    .fill(isEnabled ? Color.green : Color.orange)
                    .frame(width: 12, height: 12)
                
                Text(isEnabled ? "Safari Extension Enabled" : "Safari Extension Disabled")
                    .font(.callout.weight(.medium))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
            )
            
            // Enable button (only show if not enabled)
            if !isEnabled {
                Button(action: onEnablePressed) {
                    HStack(spacing: 8) {
                        Image(systemName: "safari")
                        Text("Enable in Safari Settings")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            colors: [Color(hex: "667eea"), Color(hex: "764ba2")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.2), radius: 4, y: 2)
                }
            }
        }
    }
}
#endif

// Color extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    ContentView()
}


