//
//  InstallationComponents.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

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