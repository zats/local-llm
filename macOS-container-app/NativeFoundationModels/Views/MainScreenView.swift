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
            #if os(macOS)
            GradientBackground()
                .ignoresSafeArea()
            #endif
            ChatView()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.1))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                )
        }
        .sheet(isPresented: $showingSettings) {
            AppSettingsView()
        }
    }
}


#Preview {
    MainScreenView()
}
