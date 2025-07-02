//
//  CheckForUpdatesView.swift
//  NativeFoundationModels
//
//  Created by Sash Zats on 7/2/25.
//

import SwiftUI
import Sparkle
import Combine

struct CheckForUpdatesView: View {
    @ObservedObject private var checkForUpdatesViewModel: CheckForUpdatesViewModel
    
    init(updater: SPUUpdater) {
        self.checkForUpdatesViewModel = CheckForUpdatesViewModel(updater: updater)
    }
    
    var body: some View {
        Button("Check for Updates...", action: checkForUpdatesViewModel.checkForUpdates)
            .disabled(!checkForUpdatesViewModel.canCheckForUpdates)
    }
}

// View model for the check for updates view
final class CheckForUpdatesViewModel: ObservableObject {
    @Published var canCheckForUpdates = false
    
    private let updater: SPUUpdater
    
    init(updater: SPUUpdater) {
        self.updater = updater
        
        updater.publisher(for: \.canCheckForUpdates)
            .assign(to: &$canCheckForUpdates)
    }
    
    func checkForUpdates() {
        updater.checkForUpdates()
    }
}

#Preview {
    // For preview purposes, create a mock updater
    CheckForUpdatesView(updater: SPUStandardUpdaterController(startingUpdater: false, updaterDelegate: nil, userDriverDelegate: nil).updater)
}
