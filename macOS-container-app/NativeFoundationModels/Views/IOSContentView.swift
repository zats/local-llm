//
//  IOSContentView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI
import UIKit
import AVKit
import AVFoundation

struct IOSContentView: View {
    @State private var player: AVPlayer?
    @State private var videoAspectRatio: CGFloat?
    @Environment(\.colorScheme) var colorScheme
    @State private var currentColorScheme: ColorScheme?
    
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            // Video player
            if let player, let videoAspectRatio {
                VideoPlayer(player: player)
                    .background(.clear)
                    .disabled(true)
                    .aspectRatio(videoAspectRatio, contentMode: .fit)
                    .padding(-2)
                    .clipped()
            }
            
            // Open Safari button
            Button {
                if let url = URL(string: "x-safari-https://apple.com") {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack {
                    Image(.safari)
                        .resizable()
                        .frame(width: 30, height: 30)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    Text("Open Safari")
                        .font(.headline)
                }
            }
            .controlSize(.extraLarge)
            
            Spacer()
        }
        .onAppear {
            currentColorScheme = colorScheme
            setupVideoPlayer()
        }
        .onChange(of: colorScheme) { newColorScheme in
            if currentColorScheme != newColorScheme {
                currentColorScheme = newColorScheme
                switchVideo(isDark: newColorScheme == .dark)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            player?.play()
        }
    }
    
    private func setupVideoPlayer() {
        // Configure audio session
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set audio session: \(error)")
        }
        
        let videoName = colorScheme == .dark ? "onboarding_dark" : "onboarding"
        guard let videoURL = Bundle.main.url(forResource: videoName, withExtension: "mp4") else {
            return
        }
        
        let asset = AVURLAsset(url: videoURL)
        let newPlayer = AVPlayer(playerItem: AVPlayerItem(asset: asset))
        newPlayer.isMuted = true
        
        // Get video dimensions
        Task {
            do {
                let tracks = try await asset.loadTracks(withMediaType: .video)
                if let track = tracks.first {
                    let size = try await track.load(.naturalSize)
                    let transform = try await track.load(.preferredTransform)
                    
                    // Apply transform to get correct dimensions
                    let transformedSize = size.applying(transform)
                    let width = abs(transformedSize.width)
                    let height = abs(transformedSize.height)
                    
                    await MainActor.run {
                        self.videoAspectRatio = width / height
                        self.player?.play()
                    }
                }
            } catch {
                print("Failed to load video dimensions: \(error)")
            }
        }
        
        // Loop video
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: newPlayer.currentItem,
            queue: .main
        ) { _ in
            newPlayer.seek(to: .zero)
            newPlayer.play()
        }
        
        self.player = newPlayer
        if videoAspectRatio != nil {
            newPlayer.play()
        }
    }
    
    private func switchVideo(isDark: Bool) {
        guard let currentPlayer = player else { return }
        
        // Save current playback position
        let currentTime = currentPlayer.currentTime()
        let wasPlaying = currentPlayer.timeControlStatus == .playing
        
        // Load new video
        let videoName = isDark ? "onboarding_dark" : "onboarding"
        guard let videoURL = Bundle.main.url(forResource: videoName, withExtension: "mp4") else {
            return
        }
        
        let asset = AVURLAsset(url: videoURL)
        let newItem = AVPlayerItem(asset: asset)
        
        // Replace player item
        currentPlayer.replaceCurrentItem(with: newItem)
        
        // Restore playback position
        currentPlayer.seek(to: currentTime) { _ in
            if wasPlaying {
                currentPlayer.play()
            }
        }
        
        // Update aspect ratio for new video
        Task {
            do {
                let tracks = try await asset.loadTracks(withMediaType: .video)
                if let track = tracks.first {
                    let size = try await track.load(.naturalSize)
                    let transform = try await track.load(.preferredTransform)
                    
                    let transformedSize = size.applying(transform)
                    let width = abs(transformedSize.width)
                    let height = abs(transformedSize.height)
                    
                    await MainActor.run {
                        self.videoAspectRatio = width / height
                    }
                }
            } catch {
                print("Failed to load video dimensions: \(error)")
            }
        }
    }
}
