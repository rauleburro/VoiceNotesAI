# Phase 2: Native Modules

## Objective
Implement two custom native modules using Expo Modules API:
1. **NativeAudioSession** - Audio output routing (speaker/earpiece)
2. **NativeLevelMeter** - Live microphone level streaming

---

## Module 1: NativeAudioSession

### TypeScript API

```typescript
// modules/native-audio-session/src/NativeAudioSession.types.ts
export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown';

export interface NativeAudioSessionModule {
  getRoute(): Promise<AudioRoute>;
  setRoute(route: 'speaker' | 'earpiece'): Promise<void>;
}
```

### iOS Implementation (Swift)

**File: `modules/native-audio-session/ios/NativeAudioSessionModule.swift`**

```swift
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
      try session.setCategory(.playAndRecord, mode: .default)

      if route == "speaker" {
        try session.overrideOutputAudioPort(.speaker)
      } else {
        try session.overrideOutputAudioPort(.none)
      }

      try session.setActive(true)
    }
  }
}
```

### Android Implementation (Kotlin)

**File: `modules/native-audio-session/android/NativeAudioSessionModule.kt`**

```kotlin
package expo.modules.nativeaudiosession

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class NativeAudioSessionModule : Module() {
  private val audioManager: AudioManager
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  override fun definition() = ModuleDefinition {
    Name("NativeAudioSession")

    AsyncFunction("getRoute") { promise: Promise ->
      val am = audioManager
      val route = when {
        am.isBluetoothA2dpOn -> "bluetooth"
        am.isWiredHeadsetOn -> "wired"
        am.isSpeakerphoneOn -> "speaker"
        else -> "earpiece"
      }
      promise.resolve(route)
    }

    AsyncFunction("setRoute") { route: String, promise: Promise ->
      val am = audioManager
      am.mode = AudioManager.MODE_IN_COMMUNICATION

      when (route) {
        "speaker" -> {
          am.isSpeakerphoneOn = true
        }
        "earpiece" -> {
          am.isSpeakerphoneOn = false
        }
      }
      promise.resolve(null)
    }
  }
}
```

### TypeScript Wrapper

**File: `modules/native-audio-session/index.ts`**

```typescript
import { NativeModulesProxy, requireNativeModule } from 'expo-modules-core';

export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown';

interface NativeAudioSessionModule {
  getRoute(): Promise<AudioRoute>;
  setRoute(route: 'speaker' | 'earpiece'): Promise<void>;
}

const NativeAudioSession = requireNativeModule<NativeAudioSessionModule>('NativeAudioSession');

export async function getAudioRoute(): Promise<AudioRoute> {
  return await NativeAudioSession.getRoute();
}

export async function setAudioRoute(route: 'speaker' | 'earpiece'): Promise<void> {
  return await NativeAudioSession.setRoute(route);
}

export default {
  getRoute: getAudioRoute,
  setRoute: setAudioRoute,
};
```

---

## Module 2: NativeLevelMeter

### TypeScript API

```typescript
// modules/native-level-meter/src/NativeLevelMeter.types.ts
export interface LevelMeterSubscription {
  remove: () => void;
}

export interface NativeLevelMeterModule {
  start(): void;
  stop(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}
```

### iOS Implementation (Swift)

**File: `modules/native-level-meter/ios/NativeLevelMeterModule.swift`**

```swift
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
  }

  private func startMonitoring() {
    guard !isMonitoring else { return }

    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playAndRecord, mode: .default)
    try? session.setActive(true)

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

      // Update at ~15 Hz
      levelTimer = Timer.scheduledTimer(withTimeInterval: 0.066, repeats: true) { [weak self] _ in
        self?.updateLevel()
      }
    } catch {
      print("NativeLevelMeter: Failed to start - \(error)")
    }
  }

  private func updateLevel() {
    guard let recorder = audioRecorder else { return }
    recorder.updateMeters()

    // Convert dB to 0-1 range
    // Average power is typically -160 to 0 dB
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
```

### Android Implementation (Kotlin)

**File: `modules/native-level-meter/android/NativeLevelMeterModule.kt`**

```kotlin
package expo.modules.nativelevelmeter

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import kotlin.math.abs
import kotlin.math.log10

class NativeLevelMeterModule : Module() {
  private var audioRecord: AudioRecord? = null
  private var isMonitoring = false
  private var monitorJob: Job? = null
  private val scope = CoroutineScope(Dispatchers.Default)

  override fun definition() = ModuleDefinition {
    Name("NativeLevelMeter")

    Events("onLevelChange")

    Function("start") {
      startMonitoring()
    }

    Function("stop") {
      stopMonitoring()
    }
  }

  private fun startMonitoring() {
    if (isMonitoring) return

    val context = appContext.reactContext ?: return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      return
    }

    val sampleRate = 44100
    val channelConfig = AudioFormat.CHANNEL_IN_MONO
    val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

    audioRecord = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      sampleRate,
      channelConfig,
      audioFormat,
      bufferSize
    )

    audioRecord?.startRecording()
    isMonitoring = true

    monitorJob = scope.launch {
      val buffer = ShortArray(bufferSize)

      while (isActive && isMonitoring) {
        val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0
        if (read > 0) {
          // Calculate RMS
          var sum = 0.0
          for (i in 0 until read) {
            sum += buffer[i] * buffer[i]
          }
          val rms = kotlin.math.sqrt(sum / read)

          // Normalize to 0-1 (max amplitude for 16-bit is 32767)
          val normalizedLevel = (rms / 32767.0).coerceIn(0.0, 1.0)

          sendEvent("onLevelChange", mapOf("level" to normalizedLevel))
        }
        delay(66) // ~15 Hz
      }
    }
  }

  private fun stopMonitoring() {
    isMonitoring = false
    monitorJob?.cancel()
    monitorJob = null
    audioRecord?.stop()
    audioRecord?.release()
    audioRecord = null
  }
}
```

### TypeScript Wrapper

**File: `modules/native-level-meter/index.ts`**

```typescript
import { EventEmitter, requireNativeModule } from 'expo-modules-core';

interface LevelChangeEvent {
  level: number;
}

const NativeLevelMeterModule = requireNativeModule('NativeLevelMeter');
const emitter = new EventEmitter(NativeLevelMeterModule);

export function start(): void {
  NativeLevelMeterModule.start();
}

export function stop(): void {
  NativeLevelMeterModule.stop();
}

export function addListener(callback: (level: number) => void): { remove: () => void } {
  const subscription = emitter.addListener('onLevelChange', (event: LevelChangeEvent) => {
    callback(event.level);
  });

  return {
    remove: () => subscription.remove(),
  };
}

export default {
  start,
  stop,
  addListener,
};
```

---

## Module Registration

### expo-module.config.json

Create for each module:

**`modules/native-audio-session/expo-module.config.json`**
```json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["NativeAudioSessionModule"]
  },
  "android": {
    "modules": ["expo.modules.nativeaudiosession.NativeAudioSessionModule"]
  }
}
```

**`modules/native-level-meter/expo-module.config.json`**
```json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["NativeLevelMeterModule"]
  },
  "android": {
    "modules": ["expo.modules.nativelevelmeter.NativeLevelMeterModule"]
  }
}
```

### Update app.json

```json
{
  "expo": {
    "plugins": [
      "./modules/native-audio-session",
      "./modules/native-level-meter"
    ]
  }
}
```

---

## Verification Checklist

- [ ] NativeAudioSession.getRoute() returns correct value on iOS
- [ ] NativeAudioSession.getRoute() returns correct value on Android
- [ ] NativeAudioSession.setRoute('speaker') switches to speaker on both platforms
- [ ] NativeAudioSession.setRoute('earpiece') switches to earpiece on both platforms
- [ ] NativeLevelMeter.start() begins emitting level events
- [ ] Level events are normalized 0-1
- [ ] Events fire at ~15 Hz (smooth updates)
- [ ] NativeLevelMeter.stop() stops events and cleans up
- [ ] No memory leaks on start/stop cycles
- [ ] TypeScript types are correct and exported

---

## Next Phase
[Phase 3: Data Layer](./PLAN_03_DATA_LAYER.md)
