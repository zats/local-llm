//
//  LaunchManager.swift
//
//  Created by Sash Zats on 6/30/25.
//

import Foundation
import Combine

class LaunchManager: ObservableObject {
    @Published var isFirstLaunch: Bool
    
    private let firstLaunchKey = "hasLaunchedBefore"
    
    init() {
        self.isFirstLaunch = !UserDefaults.standard.bool(forKey: firstLaunchKey)
    }
    
    func markAsLaunched() {
        UserDefaults.standard.set(true, forKey: firstLaunchKey)
        isFirstLaunch = false
    }
}
