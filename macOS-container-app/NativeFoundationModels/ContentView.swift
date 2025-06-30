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

struct ModernButtonStyle: ButtonStyle {
    let isPrimary: Bool
    @State private var isHovered = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(isPrimary ? .white : Color(hex: "2c3e50"))
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                Group {
                    if isPrimary {
                        LinearGradient(
                            colors: [
                                Color(hex: "667eea").opacity(configuration.isPressed ? 0.8 : 1.0),
                                Color(hex: "764ba2").opacity(configuration.isPressed ? 0.8 : 1.0)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    } else {
                        Color.white.opacity(configuration.isPressed ? 0.9 : 1.0)
                    }
                }
            )
            .cornerRadius(25)
            .shadow(
                color: Color.black.opacity(configuration.isPressed ? 0.15 : 0.25), 
                radius: configuration.isPressed ? 6 : 10,
                y: configuration.isPressed ? 2 : 6
            )
            .scaleEffect(configuration.isPressed ? 0.96 : (isHovered ? 1.02 : 1.0))
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isHovered)
            .onHover { hovering in
                isHovered = hovering
            }
    }
}

struct ContentView: View {
    @StateObject private var binaryManager = BinaryManager()
    @State private var animateGradient = false
    
    var body: some View {
        ZStack {
            GradientBackground()
            
            VStack(spacing: 0) {                
                // Main content card
                VStack(spacing: 24) {
                    // Header with icon and title
                    VStack(spacing: 16) {
                        // Animated icon
                        ZStack {
                            Circle()
                                .fill(LinearGradient(
                                    colors: [Color.white.opacity(0.3), Color.white.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                                .frame(width: 64, height: 64)
                                .blur(radius: 20)
                                .offset(y: animateGradient ? -2 : 2)
                                .animation(.easeInOut(duration: 3).repeatForever(autoreverses: true), value: animateGradient)
                            
                            Image(.brain)
                                .font(.system(size: 32))
                                .foregroundStyle(.white)
                                .shadow(color: .black.opacity(0.6), radius: 10, y: 5)
                                .shadow(color: .purple.opacity(0.6), radius: 3, y: 3)
                        }
                    }
                    
                    // Status card with animations
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 12) {
                            ZStack {
                                // Animated pulse ring for status changes
                                Circle()
                                    .stroke(binaryManager.isInstalled ? Color(hex: "2ecc71") : Color(hex: "e74c3c"), lineWidth: 2)
                                    .frame(width: 20, height: 20)
                                    .scaleEffect(binaryManager.isProcessing ? 1.3 : 1.0)
                                    .opacity(binaryManager.isProcessing ? 0.3 : 0.0)
                                    .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: binaryManager.isProcessing)
                                
                                Circle()
                                    .fill(binaryManager.isInstalled ? Color(hex: "2ecc71") : Color(hex: "e74c3c"))
                                    .frame(width: 12, height: 12)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(0.5), lineWidth: 2)
                                            .frame(width: 18, height: 18)
                                    )
                                    .scaleEffect(binaryManager.isProcessing ? 0.8 : 1.0)
                                    .animation(.spring(response: 0.6, dampingFraction: 0.8, blendDuration: 0), value: binaryManager.isInstalled)
                                    .animation(.spring(response: 0.3, dampingFraction: 0.6, blendDuration: 0), value: binaryManager.isProcessing)
                            }
                            
                            Text("Installation Status")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                            
                            Spacer()
                        }
                        
                        Text(binaryManager.statusMessage)
                            .font(.system(size: 14))
                            .foregroundColor(Color.white.opacity(0.9))
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .animation(.easeInOut(duration: 0.3), value: binaryManager.statusMessage)
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color.white.opacity(binaryManager.isProcessing ? 0.2 : 0.15))
                            .background(
                                RoundedRectangle(cornerRadius: 15)
                                    .stroke(Color.white.opacity(binaryManager.isProcessing ? 0.3 : 0.2), lineWidth: 1)
                            )
                            .animation(.easeInOut(duration: 0.3), value: binaryManager.isProcessing)
                    )
                    
                    // Action buttons with smooth transitions
                    VStack(spacing: 12) {
                        Group {
                            if binaryManager.isInstalled {
                                HStack(spacing: 12) {
                                    Button("Reinstall") {
                                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                            binaryManager.reinstallBinary()
                                        }
                                    }
                                    .buttonStyle(ModernButtonStyle(isPrimary: true))
                                    .disabled(binaryManager.isProcessing)
                                    
                                    Button("Remove") {
                                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                            binaryManager.removeBinary()
                                        }
                                    }
                                    .buttonStyle(ModernButtonStyle(isPrimary: false))
                                    .disabled(binaryManager.isProcessing)
                                }
                            } else {
                                Button("Install Binary") {
                                    withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                        binaryManager.installBinary()
                                    }
                                }
                                .buttonStyle(ModernButtonStyle(isPrimary: true))
                                .disabled(binaryManager.isProcessing)
                            }
                        }
                        .transition(.asymmetric(
                            insertion: .scale(scale: 0.8).combined(with: .opacity),
                            removal: .scale(scale: 0.9).combined(with: .opacity)
                        ))
                        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: binaryManager.isInstalled)
                        
                        // Loading indicator with smooth appearance
                        if binaryManager.isProcessing {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .scaleEffect(0.7)
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                Text("Processing...")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color.white.opacity(0.8))
                            }
                            .padding(.top, 4)
                            .transition(.asymmetric(
                                insertion: .move(edge: .top).combined(with: .opacity),
                                removal: .move(edge: .bottom).combined(with: .opacity)
                            ))
                        }
                    }
                    .animation(.easeInOut(duration: 0.4), value: binaryManager.isProcessing)
                    
                    // Info section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Binary Location")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.white.opacity(0.7))
                        
                        HStack(spacing: 8) {
                            Text("~/bin/nativefoundationmodels-native")
                                .font(.caption.monospaced())
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color.white.opacity(0.15))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                        )
                                )
                            Button(action: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                    revealBinaryLocation()
                                }
                            }) {
                                Image(systemName: "arrow.right.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(.white.opacity(0.7))
                                    .scaleEffect(1.0)
                                    .animation(.spring(response: 0.4, dampingFraction: 0.6), value: binaryManager.isInstalled)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .help(binaryManager.isInstalled ? "Reveal in Finder" : "Open ~/bin folder")
                            .onHover { hovering in
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    // Visual feedback on hover handled by the image opacity
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 32)
            }
        }
        .frame(width: 420, height: 540)
        .onAppear {
            AppMover.moveIfNecessary()
            binaryManager.checkInstallationStatus()
            animateGradient = true
        }
    }
    
    private func revealBinaryLocation() {
        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let binDir = homeDir.appendingPathComponent("bin")
        
        if binaryManager.isInstalled {
            // Reveal the specific binary file
            let binaryPath = binDir.appendingPathComponent("nativefoundationmodels-native")
            NSWorkspace.shared.activateFileViewerSelecting([binaryPath])
        } else {
            // Open the ~/bin directory (create if needed)
            do {
                try FileManager.default.createDirectory(at: binDir, withIntermediateDirectories: true)
                NSWorkspace.shared.open(binDir)
            } catch {
                // If can't create, just try to open home directory
                NSWorkspace.shared.open(homeDir)
            }
        }
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
