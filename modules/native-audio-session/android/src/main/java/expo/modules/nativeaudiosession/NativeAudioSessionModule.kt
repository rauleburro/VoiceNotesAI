package expo.modules.nativeaudiosession

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class NativeAudioSessionModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  private val audioManager: AudioManager
    get() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  override fun definition() = ModuleDefinition {
    Name("NativeAudioSession")

    AsyncFunction("getRoute") { promise: Promise ->
      try {
        val am = audioManager
        val route = when {
          am.isBluetoothA2dpOn || am.isBluetoothScoOn -> "bluetooth"
          am.isWiredHeadsetOn -> "wired"
          am.isSpeakerphoneOn -> "speaker"
          else -> "earpiece"
        }
        promise.resolve(route)
      } catch (e: Exception) {
        promise.reject("AudioSessionError", "Failed to get audio route: ${e.message}", e)
      }
    }

    AsyncFunction("setRoute") { route: String, promise: Promise ->
      try {
        val am = audioManager
        am.mode = AudioManager.MODE_IN_COMMUNICATION

        when (route) {
          "speaker" -> {
            am.isSpeakerphoneOn = true
          }
          "earpiece" -> {
            am.isSpeakerphoneOn = false
          }
          else -> {
            promise.reject("AudioSessionError", "Invalid route: $route", null)
            return@AsyncFunction
          }
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("AudioSessionError", "Failed to set audio route: ${e.message}", e)
      }
    }
  }
}
