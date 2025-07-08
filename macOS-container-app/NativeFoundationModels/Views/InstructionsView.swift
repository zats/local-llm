//
//  InstructionsView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct InstructionsView: View {
    let onDismiss: () -> Void
    
    var body: some View {
#if os(macOS)
        ZStack {
            GradientBackground()
                .ignoresSafeArea()
            MacInstructionsContent(onDismiss: onDismiss)
        }
#else
        IOSInstructionsContent(onDismiss: onDismiss)
        #endif
    }
}

#if os(macOS)
struct MacInstructionsContent: View {
    let onDismiss: () -> Void
    
    var body: some View {
        MacContentView()
            .overlay(alignment: .topTrailing) {
                Button {
                    onDismiss()
                } label: {
                    Text("Continue")
                        .font(.system(size: 14, weight: .medium))
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
                        .padding(.top, 35)
                        .padding(.trailing, 30)
                }
                .buttonStyle(.plain)
                .focusable(false)
            }
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
