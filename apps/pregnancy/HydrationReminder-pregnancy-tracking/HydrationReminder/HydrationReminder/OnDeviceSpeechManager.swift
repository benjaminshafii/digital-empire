import Foundation
import Speech
import AVFoundation

@MainActor
class OnDeviceSpeechManager: NSObject, ObservableObject, @unchecked Sendable {
    @Published var liveTranscript: String = ""
    @Published var isTranscribing = false
    @Published var error: Error?
    
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var audioFile: AVAudioFile?
    private var recordingURL: URL?
    
    nonisolated override init() {
        super.init()
        Task { @MainActor in
            self.setupAudioEngine()
        }
    }
    
    private func setupAudioEngine() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothHFP])
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("❌ Audio session setup failed: \(error)")
        }
    }
    
    func requestPermission() async -> Bool {
        let speechStatus = await SFSpeechRecognizer.requestAuthorization()
        let micStatus = await AVAudioApplication.requestRecordPermission()
        return speechStatus == .authorized && micStatus
    }
    
    func startLiveTranscription(recordingURL: URL) throws {
        guard !isTranscribing else { return }
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            print("❌ Speech recognizer not available")
            throw SpeechError.recognizerUnavailable
        }
        
        self.recordingURL = recordingURL
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            print("❌ Failed to create recognition request")
            throw SpeechError.requestFailed
        }
        
        recognitionRequest.shouldReportPartialResults = true
        recognitionRequest.requiresOnDeviceRecognition = false  // Allow network if on-device fails
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        print("🎤 Recording format: \(recordingFormat)")
        
        // Create audio file to save recording - use CAF format for PCM compatibility
        let tempURL = recordingURL.deletingPathExtension().appendingPathExtension("caf")
        do {
            // Use CAF format which supports PCM directly
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatLinearPCM),
                AVSampleRateKey: recordingFormat.sampleRate,
                AVNumberOfChannelsKey: recordingFormat.channelCount,
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsBigEndianKey: false,
                AVLinearPCMIsFloatKey: false
            ]
            
            audioFile = try AVAudioFile(forWriting: tempURL, settings: settings)
            print("🎤 Audio file created at: \(tempURL)")
        } catch {
            print("❌ Failed to create audio file: \(error)")
            throw SpeechError.audioEngineFailed
        }
        
        print("🎤 Setting up recognition task...")
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else {
                print("🎤 Recognition callback - self is nil, ignoring")
                return
            }

            if let result = result {
                let transcript = result.bestTranscription.formattedString
                DispatchQueue.main.async {
                    self.liveTranscript = transcript
                    print("🎤 Live transcript updated: '\(transcript)' (isFinal: \(result.isFinal))")
                }
            }

            if let error = error {
                let nsError = error as NSError
                print("❌ Speech recognition error: \(error)")
                print("❌ Error domain: \(nsError.domain)")
                print("❌ Error code: \(nsError.code)")

                // Code 301 is cancellation - this is EXPECTED when we stop recording
                if nsError.code == 301 {
                    print("⚠️ Recognition was canceled (this is normal when stopping)")
                } else {
                    print("❌ Unexpected recognition error!")
                    DispatchQueue.main.async {
                        self.error = error
                    }
                }
            }

            if error != nil || result?.isFinal == true {
                print("🎤 Recognition callback finished (final: \(result?.isFinal ?? false), error: \(error != nil))")
            }
        }
        
        print("🎤 Installing audio tap...")
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            guard let self = self else { return }
            
            // Send to speech recognizer
            self.recognitionRequest?.append(buffer)
            
            // Write to audio file
            do {
                try self.audioFile?.write(from: buffer)
            } catch {
                print("❌ Error writing audio buffer: \(error)")
            }
        }
        
        print("🎤 Starting audio engine...")
        audioEngine.prepare()
        try audioEngine.start()
        
        isTranscribing = true
        liveTranscript = ""
        print("✅ Live transcription started successfully")
    }
    
    func stopLiveTranscription() -> (transcript: String, recordingURL: URL?) {
        print("🎙️🎙️🎙️ ============================================")
        print("🎙️🎙️🎙️ stopLiveTranscription() CALLED")
        print("🎙️🎙️🎙️ ============================================")
        print("🎙️ Current liveTranscript: '\(liveTranscript)'")
        print("🎙️ Current recordingURL: \(recordingURL?.path ?? "nil")")

        let finalTranscript = liveTranscript

        print("🎙️ Calling stopAudioEngine()...")
        stopAudioEngine()
        print("🎙️ ✅ Audio engine stopped")

        isTranscribing = false
        print("🎙️ ✅ isTranscribing set to false")

        // Convert CAF to M4A for OpenAI compatibility
        let finalURL: URL?
        if let originalURL = recordingURL {
            let cafURL = originalURL.deletingPathExtension().appendingPathExtension("caf")
            print("🎙️ Original URL (m4a): \(originalURL.path)")
            print("🎙️ CAF file URL: \(cafURL.path)")
            print("🎙️ CAF file exists: \(FileManager.default.fileExists(atPath: cafURL.path))")

            // Convert CAF to M4A (OpenAI only supports specific formats)
            print("🎙️ Converting CAF to M4A for OpenAI compatibility...")
            if let m4aURL = convertCAFToM4A(cafURL: cafURL, targetURL: originalURL) {
                print("🎙️ ✅ Successfully converted to M4A: \(m4aURL.path)")
                finalURL = m4aURL
            } else {
                print("🎙️ ❌ Conversion failed, returning CAF URL (will likely fail with OpenAI)")
                finalURL = cafURL
            }
        } else {
            print("🎙️ ⚠️ WARNING: No recording URL available!")
            finalURL = nil
        }

        // Close audio file
        audioFile = nil
        recordingURL = nil
        print("🎙️ ✅ Audio file closed, recordingURL cleared")

        // Keep transcript visible for a moment, then clear after delay to avoid jarring transition
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s delay
            print("🎙️ Clearing liveTranscript after delay")
            self.liveTranscript = ""
        }

        print("🎙️ Returning:")
        print("🎙️   - transcript: '\(finalTranscript)'")
        print("🎙️   - recordingURL: \(finalURL?.path ?? "nil")")
        print("🎙️🎙️🎙️ ============================================")
        print("🎙️🎙️🎙️ stopLiveTranscription() COMPLETE")
        print("🎙️🎙️🎙️ ============================================")

        return (finalTranscript, finalURL)
    }

    private func convertCAFToM4A(cafURL: URL, targetURL: URL) -> URL? {
        print("🎙️ 🔄 Starting CAF to M4A conversion...")
        print("🎙️ 🔄 Source: \(cafURL.path)")
        print("🎙️ 🔄 Target: \(targetURL.path)")

        guard FileManager.default.fileExists(atPath: cafURL.path) else {
            print("🎙️ ❌ CAF file doesn't exist at path")
            return nil
        }

        do {
            // Read the CAF file
            let cafFile = try AVAudioFile(forReading: cafURL)
            print("🎙️ 🔄 CAF file opened successfully")
            print("🎙️ 🔄 Sample rate: \(cafFile.fileFormat.sampleRate)")
            print("🎙️ 🔄 Channels: \(cafFile.fileFormat.channelCount)")

            // Create M4A file with AAC encoding
            let m4aSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: cafFile.fileFormat.sampleRate,
                AVNumberOfChannelsKey: cafFile.fileFormat.channelCount,
                AVEncoderBitRateKey: 128000, // 128 kbps
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]

            let m4aFile = try AVAudioFile(forWriting: targetURL, settings: m4aSettings)
            print("🎙️ 🔄 M4A file created for writing")

            // Read and write in chunks
            let bufferSize: AVAudioFrameCount = 4096
            guard let buffer = AVAudioPCMBuffer(pcmFormat: cafFile.processingFormat, frameCapacity: bufferSize) else {
                print("🎙️ ❌ Failed to create audio buffer")
                return nil
            }

            print("🎙️ 🔄 Converting audio data...")
            var totalFrames: AVAudioFramePosition = 0

            while cafFile.framePosition < cafFile.length {
                try cafFile.read(into: buffer)
                try m4aFile.write(from: buffer)
                totalFrames += AVAudioFramePosition(buffer.frameLength)
            }

            print("🎙️ ✅ Conversion complete - \(totalFrames) frames written")
            print("🎙️ ✅ M4A file exists: \(FileManager.default.fileExists(atPath: targetURL.path))")

            // Get file size
            let attributes = try FileManager.default.attributesOfItem(atPath: targetURL.path)
            let fileSize = attributes[.size] as? Int64 ?? 0
            print("🎙️ ✅ M4A file size: \(fileSize) bytes")

            // Delete the CAF file to save space
            try? FileManager.default.removeItem(at: cafURL)
            print("🎙️ 🗑️ Deleted CAF file")

            return targetURL
        } catch {
            print("🎙️ ❌ Conversion error: \(error)")
            return nil
        }
    }
    
    private func stopAudioEngine() {
        print("🎙️ stopAudioEngine() - Stopping audio engine...")
        audioEngine.stop()
        print("🎙️ stopAudioEngine() - Removing tap on bus 0...")
        audioEngine.inputNode.removeTap(onBus: 0)
        print("🎙️ stopAudioEngine() - Ending audio on recognition request...")
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        print("🎙️ stopAudioEngine() - Canceling recognition task (this may trigger cancel error)...")
        recognitionTask?.cancel()
        recognitionTask = nil
        print("🎙️ stopAudioEngine() - ✅ Complete")
    }
    
    enum SpeechError: LocalizedError {
        case recognizerUnavailable
        case requestFailed
        case audioEngineFailed
        
        var errorDescription: String? {
            switch self {
            case .recognizerUnavailable:
                return "Speech recognizer is not available"
            case .requestFailed:
                return "Failed to create recognition request"
            case .audioEngineFailed:
                return "Audio engine failed to start"
            }
        }
    }
}

extension AVAudioApplication {
    static func requestRecordPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }
}

extension SFSpeechRecognizer {
    static func requestAuthorization() async -> SFSpeechRecognizerAuthorizationStatus {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }
}
