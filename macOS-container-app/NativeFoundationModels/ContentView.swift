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
                            colors: [Color(hex: "667eea"), Color(hex: "764ba2")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    } else {
                        Color.white
                    }
                }
            )
            .cornerRadius(25)
            .shadow(
                color: Color.black.opacity(0.2), 
                radius: 8,
                y: 4
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
    }
}

struct ContentView: View {
    @StateObject private var binaryManager = BinaryManager()
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
                
                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(binaryManager.isInstalled ? Color(hex: "2ecc71") : Color(hex: "e74c3c"))
                                .frame(width: 12, height: 12)
                                .overlay(
                                    Circle()
                                        .stroke(Color.white.opacity(0.5), lineWidth: 2)
                                        .frame(width: 18, height: 18)
                                )
                            
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
                    }
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color.white.opacity(0.15))
                            .background(
                                RoundedRectangle(cornerRadius: 15)
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    )
                    
                    VStack(alignment: .leading, spacing: 8) {
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
                        }
                        .overlay(alignment: .trailing) {
                            Button(action: {
                                revealBinaryLocation()
                            }) {
                                Image(systemName: "arrow.right.circle.fill")
                                    .font(.title3)
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            .buttonStyle(PlainButtonStyle())
                            .focusable(false)
                            .help(binaryManager.isInstalled ? "Reveal in Finder" : "Open ~/bin folder")
                            .padding(.trailing, 4)
                        }
                        Text("Binary Location")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                            .padding(.leading, 8)
                        
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Action buttons with fixed layout
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            if binaryManager.isInstalled {
                                Button("Reinstall") {
                                    binaryManager.reinstallBinary()
                                }
                                .buttonStyle(ModernButtonStyle(isPrimary: true))
                                .disabled(binaryManager.isProcessing)
                                .focusable(false)
                                
                                Button("Remove") {
                                    binaryManager.removeBinary()
                                }
                                .buttonStyle(ModernButtonStyle(isPrimary: false))
                                .disabled(binaryManager.isProcessing)
                                .focusable(false)
                            } else {
                                Button("Install Binary") {
                                    binaryManager.installBinary()
                                }
                                .buttonStyle(ModernButtonStyle(isPrimary: true))
                                .disabled(binaryManager.isProcessing)
                                .frame(maxWidth: .infinity)
                                .focusable(false)
                            }
                        }
                        .frame(height: 44) // Fixed height for button area
                        
                        // Fixed space for loading indicator to prevent layout shifts
                        HStack(spacing: 8) {
                            if binaryManager.isProcessing {
                                ProgressView()
                                    .scaleEffect(0.7)
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                Text("Processing...")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color.white.opacity(0.8))
                            } else {
                                // Invisible placeholder to maintain layout
                                Color.clear
                                    .frame(height: 16)
                            }
                        }
                        .frame(height: 20)
                        .padding(.top, 4)
                    }
                                    }
                .padding(.horizontal, 32)
            }
        }
        .frame(width: 420, height: 640)
        .onAppear {
            AppMover.moveIfNecessary()
            binaryManager.checkInstallationStatus()
            heartbeat = true
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
