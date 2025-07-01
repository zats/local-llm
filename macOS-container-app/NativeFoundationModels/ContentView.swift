//
//  ContentView.swift
//  NativeFoundationModels
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
        .ignoresSafeArea()
    }
}

struct ContentView: View {
    @StateObject private var stepManager = InstallationStepManager()
    @State private var heartbeat = false
    
    var body: some View {
        ZStack {
            GradientBackground()
            
            VStack(spacing: 0) {
                Image(.brain)
                    .font(.system(size: 32))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
                    .scaleEffect(heartbeat ? 1.02 : 1.0)
                    .animation(
                        .easeInOut(duration: 1.2)
                        .repeatForever(autoreverses: true),
                        value: heartbeat
                    )
                    .padding(.top, 40)
                    .padding(.bottom, 32)
                
                VStack(spacing: 16) {
                    ForEach(InstallationStep.allCases, id: \.rawValue) { step in
                        InstallationStepView(
                            step: step,
                            isCompleted: stepManager.stepStatuses[step, default: false],
                            isInProgress: stepManager.stepInProgress[step, default: false]
                        ) {
                            stepManager.executeStep(step)
                        }
                        .environmentObject(stepManager)
                    }
                }
                .padding(.horizontal, 32)
                
                Spacer()
            }
        }
        .frame(width: 420, height: 750)
        .onAppear {
            AppMover.moveIfNecessary()
            heartbeat = true
        }
    }
}

struct InstallationStepView: View {
    let step: InstallationStep
    let isCompleted: Bool
    let isInProgress: Bool
    let onExecute: () -> Void
    @EnvironmentObject var stepManager: InstallationStepManager
    
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
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    } else if isInProgress {
                        ProgressView()
                            .scaleEffect(0.6)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("\(step.rawValue)")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(step.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text(step.description)
                        .font(.system(size: 13))
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
                    
                    ComponentStatusRow(
                        title: "Native Messaging Host",
                        subtitle: "~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nativeFoundationModels.native.json",
                        isInstalled: stepManager.isNativeMessagingHostInstalled(),
                        onReveal: { stepManager.revealNativeMessagingHostInFinder() }
                    )
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
                    .font(.system(size: 14, weight: .semibold))
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
        switch step {
        case .installBinary:
            return "terminal"
        case .installExtension:
            return "safari"
        }
    }
    
    private var stepButtonText: String {
        switch step {
        case .installBinary:
            return "Install"
        case .installExtension:
            return "Open Store"
        }
    }
}

struct ComponentStatusRow: View {
    let title: String
    let subtitle: String
    let isInstalled: Bool
    let onReveal: () -> Void
    
    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(isInstalled ? Color(hex: "2ecc71") : Color(hex: "e74c3c"))
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
                
                Text(subtitle)
                    .font(.system(size: 10).monospaced())
                    .foregroundColor(Color.white.opacity(0.6))
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            
            Spacer()
            
            Button(action: onReveal) {
                Image(systemName: "arrow.right.circle.fill")
                    .font(.system(size: 16))
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
