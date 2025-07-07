//
//  MacContentView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI
import SafariServices

struct MacContentView: View {
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