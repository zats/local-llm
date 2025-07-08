//
//  ChatView.swift
//
//  Created by Sash Zats on 6/30/25.
//

import SwiftUI

// Platform-compatible color helpers
extension Color {
    static var platformBackground: Color {
        #if os(macOS)
        return Color(NSColor.controlBackgroundColor)
        #else
        return Color(.systemBackground)
        #endif
    }
    
    static var platformSecondaryBackground: Color {
        #if os(macOS)
        return Color(NSColor.controlColor)
        #else
        return Color(.systemGray6)
        #endif
    }
    
    static var chatBackground: Color {
        #if os(macOS)
        return Color(NSColor.windowBackgroundColor)
        #else
        return Color(.systemBackground)
        #endif
    }
    
    static var messageBackground: Color {
        #if os(macOS)
        return Color(.systemGray).opacity(0.5)
        #else
        return Color(.systemGray5)
        #endif
    }
    
    static var inputFieldBackground: Color {
        #if os(macOS)
        return Color(NSColor.controlColor)
        #else
        return Color(.systemGray6)
        #endif
    }
}

struct ChatView: View {
    @StateObject private var sessionManager = SimpleChatSessionManager()
    @State private var messageInput = ""
    @State private var showingCodeExport = false
    @State private var showingSystemPromptEditor = false
    @State private var showingAppSettings = false
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with status and controls
            chatHeader
            
            // Messages area
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 16) {
                        // Add some top padding
                        Color.clear.frame(height: 20)
                        
                        ForEach(sessionManager.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                                .transition(.asymmetric(
                                    insertion: .scale(scale: 0.8, anchor: message.role == .user ? .bottomTrailing : .bottomLeading)
                                        .combined(with: .opacity),
                                    removal: .opacity
                                ))
                        }
                        
                        if sessionManager.isLoading {
                            LoadingIndicator()
                                .transition(.scale.combined(with: .opacity))
                        }
                        
                        if let errorMessage = sessionManager.errorMessage {
                            ErrorBubble(message: errorMessage)
                                .transition(.scale.combined(with: .opacity))
                        }
                        
                        // Bottom padding to ensure last message isn't cut off
                        Color.clear.frame(height: 20)
                    }
                    .padding(.horizontal, 16)
                    .animation(.spring(response: 0.3, dampingFraction: 0.8), value: sessionManager.messages.count)
                }
                .background(Color.chatBackground)
                .onChange(of: sessionManager.messages.count) { _ in
                    if let lastMessage = sessionManager.messages.last {
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Input area
            chatInput
        }
        .background(Color.chatBackground)
        .onAppear {
            sessionManager.createNewSession()
        }
        .sheet(isPresented: $showingCodeExport) {
            CodeExportView(jsCode: sessionManager.generateJavaScriptCode())
        }
        .sheet(isPresented: $showingSystemPromptEditor) {
            SystemPromptEditor(
                systemPrompt: $sessionManager.systemPrompt,
                onSave: { sessionManager.updateSystemPrompt($0) }
            )
        }
        .sheet(isPresented: $showingAppSettings) {
            AppSettingsView()
        }
    }
    
    private var chatHeader: some View {
        VStack(spacing: 0) {
            HStack {
                HStack(spacing: 16) {
                    Button(action: sessionManager.clearChat) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 18))
                            .foregroundColor(sessionManager.messages.isEmpty ? .gray : .blue)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .disabled(sessionManager.messages.isEmpty)
                    .help("Reset Chat")

                    Button(action: { showingCodeExport = true }) {
                        Image(systemName: "chevron.left.forwardslash.chevron.right")
                            .font(.system(size: 18))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .help("Copy Code")
                }
                Spacer()
                
                // Center - Profile
                VStack(spacing: 6) {
                    // Brain image as profile pic
                    Image(.brain)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 40, height: 40)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )
                    
                        HStack(spacing: 4) {
                            Circle()
                                .fill(sessionManager.isAvailable ? Color.green : Color.gray)
                                .frame(width: 6, height: 6)
                            Text(sessionManager.isAvailable ? "Available" : "Offline")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                }
                Spacer()
                // Right side - Chat Actions
                HStack(spacing: 16) {
                    Button(action: { showingSystemPromptEditor = true }) {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 18))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .help("Chat Settings")
                    Button(action: { showingAppSettings = true }) {
                        Image(systemName: "gearshape")
                            .font(.system(size: 18))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .help("App Settings")
                }
                
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color.chatBackground)
            Divider()
        }
    }
    
    private var chatInput: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 12) {
                // Text input with iMessage-style background
                HStack {
                    TextField("Your message", text: $messageInput, axis: .vertical)
                        .focused($isInputFocused)
                        .textFieldStyle(.plain)
                        .lineLimit(1...5)
                        .font(.system(size: 16))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .onSubmit {
                            sendStreamingMessage()
                        }
                }
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.inputFieldBackground)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                        )
                )
                
                // Send button - always visible but disabled when no text
                Button(action: {
                    sendStreamingMessage()
                }) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 32, height: 32)
                        .background(
                            Circle()
                                .fill(messageInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sessionManager.isLoading ? Color.gray : Color(hex: "007AFF"))
                        )
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(messageInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sessionManager.isLoading)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.chatBackground)
        }
    }
    
    private func sendMessage() {
        let message = messageInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }
        
        sessionManager.sendMessage(message)
        messageInput = ""
    }
    
    private func sendStreamingMessage() {
        let message = messageInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }
        
        sessionManager.streamMessage(message)
        messageInput = ""
    }
}

struct MessageBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.role == .user {
                Spacer(minLength: 60)
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(message.content)
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color(hex: "8B5CF6"), Color(hex: "A855F7"), Color(hex: "C084FC")]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(MessageBubbleShape(isFromUser: true))
                        .textSelection(.enabled)
                    
                    Text(message.timestamp, style: .time)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .padding(.trailing, 8)
                }
            } else {
                // Assistant avatar (smaller, inline)
                Circle()
                    .fill(LinearGradient(
                        gradient: Gradient(colors: [Color(hex: "667eea"), Color(hex: "764ba2")]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 24, height: 24)
                    .overlay(
                        Image(systemName: "brain")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(message.content)
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.messageBackground)
                        .clipShape(MessageBubbleShape(isFromUser: false))
                        .textSelection(.enabled)
                        .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
                    
                    Text(message.timestamp, style: .time)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .padding(.leading, 8)
                }
                
                Spacer(minLength: 60)
            }
        }
    }
}

struct MessageBubbleShape: Shape {
    let isFromUser: Bool
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let radius: CGFloat = 18
        
        if isFromUser {
            // User bubble - rounded except bottom right
            path.move(to: CGPoint(x: rect.minX + radius, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
            path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.minY + radius), 
                       radius: radius, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX + radius, y: rect.maxY))
            path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.maxY - radius), 
                       radius: radius, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
            path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
            path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.minY + radius), 
                       radius: radius, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        } else {
            // Assistant bubble - rounded except bottom left
            path.move(to: CGPoint(x: rect.minX + radius, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
            path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.minY + radius), 
                       radius: radius, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
            path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.maxY - radius), 
                       radius: radius, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
            path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.minY + radius), 
                       radius: radius, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        }
        
        return path
    }
}

struct LoadingIndicator: View {
    @State private var isAnimating = false
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            // Assistant avatar (smaller, inline)
            Circle()
                .fill(LinearGradient(
                    gradient: Gradient(colors: [Color(hex: "667eea"), Color(hex: "764ba2")]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 24, height: 24)
                .overlay(
                    Image(systemName: "brain")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                )
            
            // Typing indicator bubble
            HStack(spacing: 4) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(Color.gray)
                        .frame(width: 8, height: 8)
                        .scaleEffect(isAnimating ? 1.0 : 0.3)
                        .animation(
                            .easeInOut(duration: 0.6)
                            .repeatForever()
                            .delay(Double(index) * 0.2),
                            value: isAnimating
                        )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.messageBackground)
            .clipShape(MessageBubbleShape(isFromUser: false))
            .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
            
            Spacer(minLength: 60)
        }
        .onAppear {
            isAnimating = true
        }
    }
}

struct ErrorBubble: View {
    let message: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 16))
                .foregroundColor(.red)
            
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(.red)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.red.opacity(0.3), lineWidth: 1)
                )
        )
    }
}

struct CodeExportView: View {
    let jsCode: String
    @Environment(\.dismiss) private var dismiss
    @State private var copied = false
    
    var body: some View {
        #if os(macOS)
        VStack(spacing: 0) {
            // Custom header for macOS
            HStack {
                Button(copied ? "Copied" : "Copy") {
                    copyCode()
                }
                .disabled(copied)
                
                Spacer()
                
                Text("Export Code")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("Done") {
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(Color(NSColor.windowBackgroundColor))
            
            Divider()
            
            // Content
            ScrollView {
                Text(jsCode)
                    .font(.system(.caption, design: .monospaced))
                    .textSelection(.enabled)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(8)
            }
            .padding()
            .background(Color(NSColor.controlBackgroundColor))
        }
        .frame(width: 600, height: 500)
        .background(Color(NSColor.windowBackgroundColor))
        #else
        NavigationView {
            ScrollView {
                Text(jsCode)
                    .font(.system(.caption, design: .monospaced))
                    .textSelection(.enabled)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.platformSecondaryBackground)
                    .cornerRadius(8)
            }
            .padding()
            .navigationTitle("Export Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
                
                ToolbarItem(placement: .topBarLeading) {
                    Button(copied ? "Copied" : "Copy", systemImage: copied ? "checkmark" : "document.on.document") { copyCode() }
                        .disabled(copied)
                }
            }
        }
        #endif
    }
    
    private func copyCode() {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(jsCode, forType: .string)
        #else
        UIPasteboard.general.string = jsCode
        #endif
        
        copied = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copied = false
        }
    }
}

struct AppSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        #if os(macOS)
        VStack(spacing: 0) {
            MacContentView()
                .overlay(alignment: .topTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        HStack {
                            Text("Done")
                                .font(.system(size: 14, weight: .medium))
                        }
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
                    }
                    .buttonStyle(PlainButtonStyle())
                    .focusable(false)
                    .padding(.top, 35)
                    .padding(.trailing, 35)
                }
        }
        .frame(width: 420, height: 700)
        .background(Color(NSColor.windowBackgroundColor))
        #else
        NavigationView {
            VStack {
                IOSContentView()
            }
            .navigationTitle("App Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        #endif
    }
}

struct SystemPromptEditor: View {
    @Binding var systemPrompt: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var localPrompt: String = ""
    
    var body: some View {
        #if os(macOS)
        VStack(spacing: 0) {
            // Custom header for macOS
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                
                Spacer()
                
                Text("System Prompt")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("Save") {
                    onSave(localPrompt)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(Color(NSColor.windowBackgroundColor))
            
            Divider()
            
            // Content
            VStack(alignment: .leading, spacing: 16) {
                Text("Define how the AI assistant should behave:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextEditor(text: $localPrompt)
                    .font(.body)
                    .padding(8)
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(8)
            }
            .padding()
            .background(Color(NSColor.controlBackgroundColor))
        }
        .frame(width: 500, height: 400)
        .background(Color(NSColor.windowBackgroundColor))
        .onAppear {
            localPrompt = systemPrompt
        }
        #else
        NavigationView {
            VStack(alignment: .leading, spacing: 16) {
                Text("System Prompt")
                    .font(.headline)
                
                Text("Define how the AI assistant should behave:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextEditor(text: $localPrompt)
                    .font(.body)
                    .padding(8)
                    .background(Color.platformSecondaryBackground)
                    .cornerRadius(8)
                
                Spacer()
            }
            .padding()
            .navigationTitle("System Prompt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(localPrompt)
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            localPrompt = systemPrompt
        }
        #endif
    }
}

#Preview {
    ChatView()
}

