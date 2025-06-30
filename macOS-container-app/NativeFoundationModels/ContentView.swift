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
    @State private var isPressed = false
    
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
            .shadow(color: Color.black.opacity(configuration.isPressed ? 0.1 : 0.2), 
                    radius: configuration.isPressed ? 4 : 8,
                    y: configuration.isPressed ? 0 : 4)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct ContentView: View {
    @StateObject private var binaryManager = BinaryManager()
    @State private var animateGradient = false
    
    var body: some View {
        ZStack {
            GradientBackground()
            
            VStack(spacing: 0) {
                // Window title bar area
                HStack {
                    Spacer()
                    Text("NativeFoundationModels")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                        .frame(maxWidth: .infinity)
                    Spacer()
                }
                .frame(height: 28)
                .background(Color.clear)
                
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
                            
                            Image(systemName: "sparkles")
                                .font(.system(size: 32))
                                .foregroundStyle(.white)
                        }
                    }
                    
                    // Status card
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
                    
                    // Action buttons
                    VStack(spacing: 12) {
                        if binaryManager.isInstalled {
                            HStack(spacing: 12) {
                                Button("Reinstall") {
                                    binaryManager.reinstallBinary()
                                }
                                .buttonStyle(ModernButtonStyle(isPrimary: true))
                                .disabled(binaryManager.isProcessing)
                                
                                Button("Remove") {
                                    binaryManager.removeBinary()
                                }
                                .buttonStyle(ModernButtonStyle(isPrimary: false))
                                .disabled(binaryManager.isProcessing)
                            }
                        } else {
                            Button("Install Binary") {
                                binaryManager.installBinary()
                            }
                            .buttonStyle(ModernButtonStyle(isPrimary: true))
                            .disabled(binaryManager.isProcessing)
                        }
                        
                        // Loading indicator with modern style
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
                        }
                    }
                    
                    // Info section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Binary Location")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.white.opacity(0.7))
                        
                        Text("~/bin/nativefoundationmodels-native")
                            .font(.system(size: 11, design: .monospaced))
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
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 32)
                .padding(.top, 16)
                
                Spacer()
            }
        }
        .frame(width: 420, height: 480)
        .onAppear {
            binaryManager.checkInstallationStatus()
            animateGradient = true
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
