import ExpoModulesCore
import AVFoundation

public class NativeAudioSessionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeAudioSession")

    AsyncFunction("getRoute") { () -> String in
      let session = AVAudioSession.sharedInstance()
      let currentRoute = session.currentRoute

      for output in currentRoute.outputs {
        switch output.portType {
        case .builtInSpeaker:
          return "speaker"
        case .builtInReceiver:
          return "earpiece"
        case .bluetoothA2DP, .bluetoothLE, .bluetoothHFP:
          return "bluetooth"
        case .headphones, .headsetMic:
          return "wired"
        default:
          continue
        }
      }
      return "unknown"
    }

    AsyncFunction("setRoute") { (route: String) in
      let session = AVAudioSession.sharedInstance()

      do {
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])

        if route == "speaker" {
          try session.overrideOutputAudioPort(.speaker)
        } else {
          try session.overrideOutputAudioPort(.none)
        }

        try session.setActive(true)
      } catch {
        throw Exception(name: "AudioSessionError", description: "Failed to set audio route: \(error.localizedDescription)")
      }
    }
  }
}
