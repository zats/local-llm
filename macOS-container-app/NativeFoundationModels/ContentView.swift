//
//  ContentView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var launchManager = LaunchManager()
    
    var body: some View {
        Group {
            if launchManager.isFirstLaunch {
                InstructionsView {
                    launchManager.markAsLaunched()
                }
            } else {
                MainScreenView()
            }
        }
        .animation(.easeInOut(duration: 0.5), value: launchManager.isFirstLaunch)
    }
}

#Preview {
    ContentView()
}


