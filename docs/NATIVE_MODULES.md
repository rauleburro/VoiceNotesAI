# Módulos Nativos de VoiceNotesAI

Este documento explica en detalle los módulos nativos creados para la aplicación VoiceNotesAI, por qué fueron necesarios, cómo funcionan, y cómo se resolvieron los problemas de integración.

## Índice

1. [¿Por qué módulos nativos?](#por-qué-módulos-nativos)
2. [Arquitectura de Expo Modules](#arquitectura-de-expo-modules)
3. [NativeLevelMeter](#nativelevelmeter)
4. [NativeAudioSession](#nativeaudiosession)
5. [Estructura de archivos](#estructura-de-archivos)
6. [Configuración crítica](#configuración-crítica)
7. [Problema resuelto: "Cannot find native module"](#problema-resuelto)

---

## ¿Por qué módulos nativos?

React Native y Expo proporcionan muchas APIs, pero hay funcionalidades de audio que requieren acceso directo a las APIs nativas del sistema operativo:

### NativeLevelMeter
- **Necesidad**: Mostrar un indicador visual en tiempo real del nivel de audio mientras el usuario graba
- **Problema**: `expo-av` permite grabar audio, pero NO proporciona acceso al nivel de audio en tiempo real durante la grabación
- **Solución**: Crear un módulo nativo que use `AVAudioRecorder` (iOS) y `AudioRecord` (Android) para obtener los niveles

### NativeAudioSession
- **Necesidad**: Permitir al usuario cambiar entre altavoz y auricular durante la reproducción
- **Problema**: Las APIs de React Native no exponen control directo sobre el enrutamiento de audio
- **Solución**: Crear un módulo nativo que use `AVAudioSession` (iOS) y `AudioManager` (Android)

---

## Arquitectura de Expo Modules

Expo Modules es el sistema moderno para crear módulos nativos en Expo. Usa una API declarativa que simplifica mucho el código.

```
┌─────────────────────────────────────────────────────────────┐
│                     JavaScript/TypeScript                     │
│                         (index.ts)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    expo-modules-core                          │
│              (requireNativeModule, EventEmitter)              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│     iOS (Swift)         │     │    Android (Kotlin)     │
│   NativeXXXModule.swift │     │  NativeXXXModule.kt     │
│   using AVFoundation    │     │  using AudioManager     │
└─────────────────────────┘     └─────────────────────────┘
```

---

## NativeLevelMeter

### Propósito
Proporciona niveles de audio del micrófono en tiempo real (~15 Hz) para visualización durante la grabación.

### API JavaScript

```typescript
import NativeLevelMeter from '@/modules/native-level-meter';

// Iniciar monitoreo
NativeLevelMeter.start();

// Suscribirse a cambios de nivel (valor 0-1)
const subscription = NativeLevelMeter.addListener((level: number) => {
  console.log('Nivel actual:', level); // 0.0 a 1.0
});

// Detener monitoreo
NativeLevelMeter.stop();
subscription.remove();
```

### Implementación iOS (Swift)

```swift
// modules/native-level-meter/ios/NativeLevelMeterModule.swift

import ExpoModulesCore
import AVFoundation

public class NativeLevelMeterModule: Module {
  private var audioRecorder: AVAudioRecorder?
  private var levelTimer: Timer?

  public func definition() -> ModuleDefinition {
    // Nombre del módulo (debe coincidir con requireNativeModule)
    Name("NativeLevelMeter")

    // Declaración de eventos que emitirá
    Events("onLevelChange")

    // Funciones expuestas a JavaScript
    Function("start") { self.startMonitoring() }
    Function("stop") { self.stopMonitoring() }
  }

  private func startMonitoring() {
    // 1. Configurar sesión de audio
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playAndRecord, mode: .default,
                            options: [.defaultToSpeaker, .allowBluetooth])

    // 2. Crear AVAudioRecorder con metering habilitado
    audioRecorder = try AVAudioRecorder(url: tempURL, settings: settings)
    audioRecorder?.isMeteringEnabled = true  // ¡Clave!
    audioRecorder?.record()

    // 3. Timer para leer niveles ~15 veces por segundo
    levelTimer = Timer.scheduledTimer(withTimeInterval: 0.066, repeats: true) { _ in
      self.updateLevel()
    }
  }

  private func updateLevel() {
    recorder.updateMeters()

    // Convertir dB (-160 a 0) a rango 0-1
    let dB = recorder.averagePower(forChannel: 0)
    let normalizedLevel = max(0, min(1, (dB + 60) / 60))

    // Enviar evento a JavaScript
    sendEvent("onLevelChange", ["level": normalizedLevel])
  }
}
```

**Puntos clave:**
- `AVAudioRecorder.isMeteringEnabled = true` permite leer niveles
- `updateMeters()` actualiza los valores internos
- `averagePower(forChannel:)` devuelve nivel en dB
- Convertimos dB a 0-1 para facilitar uso en UI

### Implementación Android (Kotlin)

```kotlin
// modules/native-level-meter/android/.../NativeLevelMeterModule.kt

class NativeLevelMeterModule : Module() {
  private var audioRecord: AudioRecord? = null
  private val scope = CoroutineScope(Dispatchers.Default)

  override fun definition() = ModuleDefinition {
    Name("NativeLevelMeter")
    Events("onLevelChange")

    Function("start") { startMonitoring() }
    Function("stop") { stopMonitoring() }
  }

  private fun startMonitoring() {
    // 1. Crear AudioRecord
    audioRecord = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      44100,  // Sample rate
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      bufferSize
    )
    audioRecord?.startRecording()

    // 2. Coroutine para leer buffer y calcular RMS
    monitorJob = scope.launch {
      val buffer = ShortArray(bufferSize)

      while (isMonitoring) {
        val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0

        // Calcular RMS (Root Mean Square) del audio
        var sum = 0.0
        for (i in 0 until read) {
          sum += buffer[i].toDouble() * buffer[i].toDouble()
        }
        val rms = sqrt(sum / read)

        // Normalizar a 0-1 (16-bit max = 32767)
        val normalizedLevel = (rms / 32767.0).coerceIn(0.0, 1.0)

        // Enviar evento
        sendEvent("onLevelChange", mapOf("level" to normalizedLevel))

        delay(66) // ~15 Hz
      }
    }
  }
}
```

**Puntos clave:**
- Android no tiene "metering" nativo como iOS
- Leemos el buffer de audio directamente
- Calculamos RMS (Root Mean Square) para obtener el nivel
- Usamos Kotlin Coroutines para el loop asíncrono

---

## NativeAudioSession

### Propósito
Permite cambiar la salida de audio entre altavoz y auricular del teléfono.

### API JavaScript

```typescript
import { getAudioRoute, setAudioRoute } from '@/modules/native-audio-session';

// Obtener ruta actual
const route = await getAudioRoute();
// Posibles valores: 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown'

// Cambiar a altavoz
await setAudioRoute('speaker');

// Cambiar a auricular
await setAudioRoute('earpiece');
```

### Implementación iOS (Swift)

```swift
// modules/native-audio-session/ios/NativeAudioSessionModule.swift

public class NativeAudioSessionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeAudioSession")

    AsyncFunction("getRoute") { () -> String in
      let session = AVAudioSession.sharedInstance()

      // Revisar salidas actuales
      for output in session.currentRoute.outputs {
        switch output.portType {
        case .builtInSpeaker: return "speaker"
        case .builtInReceiver: return "earpiece"
        case .bluetoothA2DP, .bluetoothHFP: return "bluetooth"
        case .headphones: return "wired"
        default: continue
        }
      }
      return "unknown"
    }

    AsyncFunction("setRoute") { (route: String) in
      let session = AVAudioSession.sharedInstance()

      // Configurar categoría
      try session.setCategory(.playAndRecord, mode: .default,
                              options: [.defaultToSpeaker, .allowBluetooth])

      // Override del puerto de salida
      if route == "speaker" {
        try session.overrideOutputAudioPort(.speaker)
      } else {
        try session.overrideOutputAudioPort(.none)  // Vuelve a earpiece
      }
    }
  }
}
```

### Implementación Android (Kotlin)

```kotlin
// modules/native-audio-session/android/.../NativeAudioSessionModule.kt

class NativeAudioSessionModule : Module() {
  private val audioManager: AudioManager
    get() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  override fun definition() = ModuleDefinition {
    Name("NativeAudioSession")

    AsyncFunction("getRoute") { promise: Promise ->
      val am = audioManager
      val route = when {
        am.isBluetoothA2dpOn || am.isBluetoothScoOn -> "bluetooth"
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
        "speaker" -> am.isSpeakerphoneOn = true
        "earpiece" -> am.isSpeakerphoneOn = false
      }
      promise.resolve(null)
    }
  }
}
```

---

## Estructura de archivos

```
modules/
├── native-level-meter/
│   ├── expo-module.config.json    # Configuración de autolinking
│   ├── index.ts                   # API JavaScript/TypeScript
│   ├── NativeLevelMeter.podspec   # Configuración CocoaPods (iOS)
│   ├── ios/
│   │   └── NativeLevelMeterModule.swift
│   └── android/
│       ├── build.gradle
│       └── src/main/java/expo/modules/nativelevelmeter/
│           └── NativeLevelMeterModule.kt
│
└── native-audio-session/
    ├── expo-module.config.json
    ├── index.ts
    ├── NativeAudioSession.podspec
    ├── ios/
    │   └── NativeAudioSessionModule.swift
    └── android/
        ├── build.gradle
        └── src/main/java/expo/modules/nativeaudiosession/
            └── NativeAudioSessionModule.kt
```

---

## Configuración crítica

### expo-module.config.json

Este archivo es **CRÍTICO** para que Expo encuentre y registre el módulo:

```json
{
  "platforms": ["apple", "android"],
  "apple": {
    "modules": ["NativeLevelMeterModule"],
    "podspecPath": "./NativeLevelMeter.podspec"  // ¡IMPORTANTE!
  },
  "android": {
    "modules": ["expo.modules.nativelevelmeter.NativeLevelMeterModule"]
  }
}
```

**Puntos críticos:**
1. `platforms` debe incluir `"apple"` (no `"ios"`)
2. `podspecPath` es **obligatorio** para módulos custom
3. El nombre en `modules` debe coincidir exactamente con la clase Swift/Kotlin

### Podspec (iOS)

```ruby
# NativeLevelMeter.podspec
Pod::Spec.new do |s|
  s.name           = 'NativeLevelMeter'
  s.version        = '1.0.0'
  s.summary        = 'Native level meter module'
  s.platforms      = { :ios => '15.1' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'  # ¡Requerido!

  s.source_files = 'ios/**/*.{h,m,mm,swift,hpp,cpp}'
end
```

### package.json

```json
{
  "expo": {
    "autolinking": {
      "nativeModulesDir": "./modules"
    }
  }
}
```

---

## Problema resuelto

### Error: "Cannot find native module 'NativeLevelMeter'"

**Síntoma:** La app compilaba pero al ejecutar mostraba:
```
Error: Cannot find native module 'NativeLevelMeter'
Error: Cannot find native module 'NativeAudioSession'
```

**Diagnóstico:**

1. Verificamos que los módulos existían:
   ```bash
   bunx expo-modules-autolinking search --platform ios
   # ✓ Encontraba los módulos
   ```

2. Pero NO estaban en la resolución:
   ```bash
   bunx expo-modules-autolinking resolve --platform ios
   # ✗ NO incluía nuestros módulos
   ```

3. El archivo `ExpoModulesProvider.swift` generado NO importaba nuestros módulos

**Causa raíz:**
El `expo-module.config.json` NO tenía `podspecPath`, que es **obligatorio** para módulos custom fuera de node_modules.

**Solución:**

```diff
// modules/native-level-meter/expo-module.config.json
{
  "platforms": ["apple", "android"],
  "apple": {
-   "modules": ["NativeLevelMeterModule"]
+   "modules": ["NativeLevelMeterModule"],
+   "podspecPath": "./NativeLevelMeter.podspec"
  },
  ...
}
```

**Después del fix:**

```bash
# Regenerar proyectos nativos
bunx expo prebuild --clean
bun run ios
```

El `ExpoModulesProvider.swift` ahora incluye:

```swift
import NativeAudioSession
import NativeLevelMeter

// En getModuleClasses():
NativeAudioSessionModule.self,
NativeLevelMeterModule.self
```

---

## Flujo de datos completo

```
┌──────────────────────────────────────────────────────────────────┐
│                         React Component                           │
│                         (LevelMeter.tsx)                          │
│                                                                   │
│  useEffect(() => {                                               │
│    NativeLevelMeter.start();                                     │
│    const sub = NativeLevelMeter.addListener((level) => {         │
│      setLevel(level);  // 0.0 - 1.0                              │
│    });                                                           │
│    return () => { sub.remove(); NativeLevelMeter.stop(); };     │
│  }, []);                                                         │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    modules/native-level-meter/index.ts            │
│                                                                   │
│  const module = requireNativeModule('NativeLevelMeter');         │
│  const emitter = new EventEmitter(module);                       │
│                                                                   │
│  export function addListener(cb) {                               │
│    return emitter.addListener('onLevelChange', (e) => cb(e.level));│
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              NativeLevelMeterModule.swift (iOS)                   │
│                                                                   │
│  Timer cada 66ms:                                                │
│    recorder.updateMeters()                                       │
│    let dB = recorder.averagePower(forChannel: 0)                 │
│    let level = (dB + 60) / 60  // Normalizar a 0-1              │
│    sendEvent("onLevelChange", ["level": level])                  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        AVAudioRecorder                            │
│                      (iOS AVFoundation)                           │
│                                                                   │
│  Captura audio del micrófono con metering habilitado             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Referencias

- [Expo Modules API](https://docs.expo.dev/modules/module-api/)
- [expo-module.config.json](https://docs.expo.dev/modules/module-config/)
- [AVAudioRecorder (iOS)](https://developer.apple.com/documentation/avfaudio/avaudiorecorder)
- [AudioRecord (Android)](https://developer.android.com/reference/android/media/AudioRecord)
