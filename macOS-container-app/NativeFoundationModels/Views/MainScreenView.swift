//
//  MainScreenView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct MainScreenView: View {
    @State private var showingSettings = false
    
    var body: some View {
        ZStack {
            GradientBackground()
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top bar with settings button
                HStack {
                    Spacer()
                    
                    Button(action: {
                        showingSettings = true
                    }) {
                        Image(systemName: "gearshape.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding(12)
                            .background(
                                Circle()
                                    .fill(Color.white.opacity(0.15))
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                    )
                            )
                    }
                    .buttonStyle(PlainButtonStyle())
                    #if os(macOS)
                    .focusable(false)
                    #endif
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                
                Spacer()
                
                // Main content area
                VStack(spacing: 40) {
                    // App icon/logo
                    Image(.brain)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 150, height: 150)
                        .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
                    
                    // Main content
                    UnderConstructionView()
                }
                
                Spacer()
            }
        }
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
    }
}

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
#if os(macOS)
                GradientBackground()
                    .ignoresSafeArea()
#endif
                VStack {
                    #if os(macOS)
                    MacContentView()
                    #else
                    IOSContentView()
                    #endif
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            #if os(macOS)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            #else
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            #endif
        }
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 700)
        #endif
    }
}

#Preview {
    MainScreenView()
}
