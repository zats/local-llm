//
//  ContentView.swift
//  NativeFoundationModels
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

struct ContentView: View {
    init() {
        print(Bundle.main.bundleURL.relativePath)
    }
    
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
