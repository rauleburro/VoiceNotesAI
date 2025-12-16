import ExpoModulesCore
import AVFoundation

public class NativeLevelMeterModule: Module {
  private var audioRecorder: AVAudioRecorder?
  private var levelTimer: Timer?
  private var isMonitoring = false

  public func definition() -> ModuleDefinition {
    Name("NativeLevelMeter")

    Events("onLevelChange")

    Function("start") {
      self.startMonitoring()
    }

    Function("stop") {
      self.stopMonitoring()
    }

    OnDestroy {
      self.stopMonitoring()
    }
  }

  private func startMonitoring() {
    guard !isMonitoring else { return }

    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
      try session.setActive(true)
    } catch {
      print("NativeLevelMeter: Failed to configure audio session - \(error)")
      return
    }

    let tempDir = FileManager.default.temporaryDirectory
    let url = tempDir.appendingPathComponent("level_meter_temp.caf")

    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatAppleLossless),
      AVSampleRateKey: 44100.0,
      AVNumberOfChannelsKey: 1,
      AVEncoderAudioQualityKey: AVAudioQuality.min.rawValue
    ]

    do {
      audioRecorder = try AVAudioRecorder(url: url, settings: settings)
      audioRecorder?.isMeteringEnabled = true
      audioRecorder?.record()
      isMonitoring = true

      // Update at ~15 Hz for smooth visualization
      DispatchQueue.main.async {
        self.levelTimer = Timer.scheduledTimer(withTimeInterval: 0.066, repeats: true) { [weak self] _ in
          self?.updateLevel()
        }
      }
    } catch {
      print("NativeLevelMeter: Failed to start recording - \(error)")
    }
  }

  private func updateLevel() {
    guard let recorder = audioRecorder, isMonitoring else { return }
    recorder.updateMeters()

    // Convert dB to 0-1 range
    // Average power typically ranges from -160 to 0 dB
    let dB = recorder.averagePower(forChannel: 0)
    let normalizedLevel = max(0, min(1, (dB + 60) / 60))

    sendEvent("onLevelChange", ["level": normalizedLevel])
  }

  private func stopMonitoring() {
    levelTimer?.invalidate()
    levelTimer = nil
    audioRecorder?.stop()
    audioRecorder = nil
    isMonitoring = false
  }
}
