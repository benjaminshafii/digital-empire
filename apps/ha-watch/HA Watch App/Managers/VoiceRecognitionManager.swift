//
//  VoiceRecognitionManager.swift
//  HA Watch App
//
//  Real voice recognition using OpenAI Whisper API
//  Adapted from phoneless-hevy workout app
//

import Foundation
import AVFoundation

@Observable
class VoiceRecognitionManager {
    var recognizedText: String = ""
    var isListening: Bool = false
    var isAuthorized: Bool = false
    var errorMessage: String?
    var lastAudioFileURL: URL?  // Expose last recorded audio file for direct parsing

    private var audioRecorder: AVAudioRecorder?
    private var audioFileURL: URL?

    // MARK: - Authorization

    func requestAuthorization() async {
        let authorized = await AVAudioApplication.requestRecordPermission()
        await MainActor.run {
            self.isAuthorized = authorized
            if !authorized {
                self.errorMessage = "Microphone permission denied"
            }
        }
    }

    // MARK: - Recording

    func startListening() {
        guard isAuthorized else {
            errorMessage = "Microphone not authorized"
            return
        }

        guard !isListening else { return }

        // Create audio file URL
        let fileManager = FileManager.default
        let tempDir = fileManager.temporaryDirectory
        audioFileURL = tempDir.appendingPathComponent("recording_\(Date().timeIntervalSince1970).m4a")

        guard let audioFileURL = audioFileURL else {
            errorMessage = "Failed to create audio file"
            return
        }

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .default)
            try audioSession.setActive(true)
        } catch {
            errorMessage = "Audio session error: \(error.localizedDescription)"
            return
        }

        // Configure recorder settings - optimized for Whisper API
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000,  // 16kHz is optimal for Whisper
            AVNumberOfChannelsKey: 1,  // Mono
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            AVEncoderBitRateKey: 32000  // 32kbps for low latency
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: audioFileURL, settings: settings)
            audioRecorder?.prepareToRecord()
            audioRecorder?.record()

            isListening = true
            recognizedText = ""
            errorMessage = nil
        } catch {
            errorMessage = "Recording failed: \(error.localizedDescription)"
        }
    }

    func stopListening() async {
        guard isListening else { return }

        audioRecorder?.stop()
        isListening = false

        // Deactivate audio session
        try? AVAudioSession.sharedInstance().setActive(false)

        // Transcribe the recording
        guard let audioFileURL = audioFileURL else {
            errorMessage = "No audio file found"
            return
        }

        // Store URL for direct audio parsing
        self.lastAudioFileURL = audioFileURL

        await transcribeAudio(fileURL: audioFileURL)

        // Note: File cleanup now happens in cleanupLastAudio()
        // This allows DirectAudioParser to access the file after transcription
        self.audioFileURL = nil
    }

    /// Clean up the last recorded audio file
    /// Call this after DirectAudioParser has finished processing
    func cleanupLastAudio() {
        if let url = lastAudioFileURL {
            try? FileManager.default.removeItem(at: url)
            print("🗑️ [VoiceManager] Cleaned up audio file: \(url.lastPathComponent)")
            lastAudioFileURL = nil
        }
    }

    // MARK: - Transcription with OpenAI Whisper

    private func transcribeAudio(fileURL: URL) async {
        print("🎤 [Transcription] Starting audio transcription...")
        print("🎤 [Transcription] Audio file: \(fileURL.path)")

        // Use OpenAI API key for Whisper transcription
        guard let apiKey = AppSettings.shared.openAIKey else {
            print("❌ [Transcription] OpenAI API key not found!")
            await MainActor.run {
                self.errorMessage = "OpenAI API key not found. Go to Settings."
                self.recognizedText = "⚠️ Configure OpenAI API key in Settings"
            }
            return
        }

        print("✅ [Transcription] OpenAI API key found (length: \(apiKey.count))")

        // Read audio file
        guard let audioData = try? Data(contentsOf: fileURL) else {
            print("❌ [Transcription] Failed to read audio file")
            await MainActor.run {
                self.errorMessage = "Failed to read audio file"
            }
            return
        }

        print("📦 [Transcription] Audio file size: \(audioData.count) bytes")

        // Create multipart form data
        let boundary = UUID().uuidString
        var body = Data()

        // Add model parameter
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n".data(using: .utf8)!)
        body.append("whisper-1\r\n".data(using: .utf8)!)

        // Add language parameter (optional, helps with accuracy)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"language\"\r\n\r\n".data(using: .utf8)!)
        body.append("en\r\n".data(using: .utf8)!)

        // Add audio file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.m4a\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        // Create request
        let endpoint = "https://api.openai.com/v1/audio/transcriptions"
        print("📡 [Transcription] Sending request to: \(endpoint)")
        print("📡 [Transcription] Request body size: \(body.count) bytes")

        var request = URLRequest(url: URL(string: endpoint)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        request.timeoutInterval = 30

        do {
            print("⏳ [Transcription] Waiting for API response...")
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [Transcription] Invalid response type")
                await MainActor.run {
                    self.errorMessage = "Invalid response"
                }
                return
            }

            print("📥 [Transcription] Response status: \(httpResponse.statusCode)")
            print("📥 [Transcription] Response size: \(data.count) bytes")

            if httpResponse.statusCode == 200 {
                // Parse response
                let responseText = String(data: data, encoding: .utf8) ?? "Unable to decode"
                print("📄 [Transcription] Raw response: \(responseText)")

                let json = try JSONDecoder().decode(WhisperResponse.self, from: data)
                print("✅ [Transcription] Successfully decoded response")
                print("✅ [Transcription] Transcribed text: \"\(json.text)\"")

                await MainActor.run {
                    self.recognizedText = json.text
                    self.errorMessage = nil
                }
            } else {
                // Handle error
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [Transcription] API Error (\(httpResponse.statusCode)): \(errorText)")

                await MainActor.run {
                    self.errorMessage = "API Error (\(httpResponse.statusCode)): \(errorText)"
                    self.recognizedText = "⚠️ Transcription failed"
                }
            }
        } catch {
            print("❌ [Transcription] Network error: \(error.localizedDescription)")
            print("❌ [Transcription] Error details: \(error)")

            await MainActor.run {
                self.errorMessage = "Network error: \(error.localizedDescription)"
                self.recognizedText = "⚠️ Check internet connection"
            }
        }
    }
}

// MARK: - Response Models

private struct WhisperResponse: Codable {
    let text: String
}
