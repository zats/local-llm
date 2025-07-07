//
//  InstructionsView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct InstructionsView: View {
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            GradientBackground()
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                // Platform-specific instructions
                #if os(macOS)
                MacInstructionsContent(onDismiss: onDismiss)
                #else
                IOSInstructionsContent(onDismiss: onDismiss)
                #endif
            }
        }
    }
}

#if os(macOS)
struct MacInstructionsContent: View {
    let onDismiss: () -> Void
    
    var body: some View {
        MacContentView()
            .overlay(
                VStack {
                    Spacer()
                    
                    Button("Continue") {
                        onDismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .padding(.bottom, 40)
                }
            )
    }
}
#else
struct IOSInstructionsContent: View {
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 40) {
            IOSContentView()
            
            Button("Continue") {
                onDismiss()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.extraLarge)
            .padding(.bottom, 20)
        }
    }
}
#endif

#Preview {
    InstructionsView(onDismiss: {})
}