//
//  UnderConstructionView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct UnderConstructionView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            Text("Under Construction")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("This feature is coming soon!")
                .font(.title2)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    UnderConstructionView()
}