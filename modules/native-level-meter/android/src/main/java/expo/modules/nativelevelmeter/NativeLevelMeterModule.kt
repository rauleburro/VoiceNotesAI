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
import kotlin.math.sqrt

class NativeLevelMeterModule : Module() {
  private var audioRecord: AudioRecord? = null
  private var isMonitoring = false
  private var monitorJob: Job? = null
  private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

  override fun definition() = ModuleDefinition {
    Name("NativeLevelMeter")

    Events("onLevelChange")

    Function("start") {
      startMonitoring()
    }

    Function("stop") {
      stopMonitoring()
    }

    OnDestroy {
      stopMonitoring()
      scope.cancel()
    }
  }

  private fun startMonitoring() {
    if (isMonitoring) return

    val context = appContext.reactContext ?: return

    // Check permission
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      return
    }

    val sampleRate = 44100
    val channelConfig = AudioFormat.CHANNEL_IN_MONO
    val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

    if (bufferSize == AudioRecord.ERROR_BAD_VALUE || bufferSize == AudioRecord.ERROR) {
      return
    }

    try {
      audioRecord = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        sampleRate,
        channelConfig,
        audioFormat,
        bufferSize
      )

      if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
        audioRecord?.release()
        audioRecord = null
        return
      }

      audioRecord?.startRecording()
      isMonitoring = true

      monitorJob = scope.launch {
        val buffer = ShortArray(bufferSize)

        while (isActive && isMonitoring) {
          val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0
          if (read > 0) {
            // Calculate RMS (Root Mean Square)
            var sum = 0.0
            for (i in 0 until read) {
              sum += buffer[i].toDouble() * buffer[i].toDouble()
            }
            val rms = sqrt(sum / read)

            // Normalize to 0-1 (max amplitude for 16-bit is 32767)
            val normalizedLevel = (rms / 32767.0).coerceIn(0.0, 1.0)

            // Send event on main thread
            withContext(Dispatchers.Main) {
              sendEvent("onLevelChange", mapOf("level" to normalizedLevel))
            }
          }
          delay(66) // ~15 Hz update rate
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
      stopMonitoring()
    }
  }

  private fun stopMonitoring() {
    isMonitoring = false
    monitorJob?.cancel()
    monitorJob = null

    try {
      audioRecord?.stop()
      audioRecord?.release()
    } catch (e: Exception) {
      e.printStackTrace()
    }
    audioRecord = null
  }
}
