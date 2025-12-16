# Phase 5: Transcription (ASR)

## Objective
Integrate Google Cloud Speech-to-Text V2 with Chirp model for automatic speech-to-text transcription.

---

## Technology Choice: Google Speech-to-Text V2 (Chirp)

### Why Google Speech-to-Text with Chirp?

| Factor | Assessment |
|--------|------------|
| **Accuracy** | Chirp is Google's latest ASR model, state-of-the-art |
| **Language Support** | 100+ languages with auto-detection |
| **Integration** | REST API, same provider as Gemini LLM |
| **Cost** | $0.016/minute (standard), $0.024/minute (Chirp) |
| **Features** | Punctuation, speaker diarization, word timestamps |

### Tradeoffs Documented

**Pros:**
- Excellent transcription quality with Chirp model
- Same Google Cloud project for ASR + LLM
- Automatic punctuation and formatting
- Good support for multiple languages

**Cons:**
- Requires internet connection
- Slightly more complex API than Whisper
- Need to handle audio encoding (FLAC/WAV preferred)
- API key exposed in client (acceptable for MVP)

**Mitigations:**
- Offline fallback could queue transcriptions
- Production would use backend proxy
- Convert audio to supported format before upload

---

## Transcription Service

**File: `services/transcription.ts`**

```typescript
import * as FileSystem from 'expo-file-system';
import { updateTranscript, updateTranscriptStatus } from './database';

const GOOGLE_SPEECH_API_URL = 'https://speech.googleapis.com/v1p1beta1/speech:recognize';

interface GoogleSpeechResponse {
  results?: Array<{
    alternatives?: Array<{
      transcript: string;
      confidence: number;
    }>;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

export async function transcribeAudio(
  noteId: string,
  audioUri: string
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  try {
    // Update status to pending
    await updateTranscriptStatus(noteId, 'pending');

    // Read audio file as base64
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio file not found');
    }

    // Check file size (Google limit: 10MB for sync, 480 min for async)
    if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
      throw new Error('Audio file too large (max 10MB for sync transcription)');
    }

    // Read file as base64
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine audio encoding based on file extension
    const extension = audioUri.split('.').pop()?.toLowerCase();
    const encodingMap: Record<string, string> = {
      'm4a': 'MP3', // M4A is AAC, but Google accepts as MP3 encoding
      'mp3': 'MP3',
      'wav': 'LINEAR16',
      'flac': 'FLAC',
      'ogg': 'OGG_OPUS',
    };
    const encoding = encodingMap[extension || ''] || 'MP3';

    // Make API request
    const response = await fetch(`${GOOGLE_SPEECH_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: encoding,
          sampleRateHertz: 44100,
          languageCode: 'en-US', // Primary language
          alternativeLanguageCodes: ['es-ES', 'fr-FR', 'de-DE'], // Auto-detect these too
          model: 'chirp', // Use latest Chirp model
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          useEnhanced: true,
        },
        audio: {
          content: audioBase64,
        },
      }),
    });

    const data: GoogleSpeechResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message || `Transcription failed: ${data.error.code}`);
    }

    if (!data.results || data.results.length === 0) {
      // No speech detected
      const transcript = '[No speech detected]';
      await updateTranscript(noteId, transcript, 'done');
      return transcript;
    }

    // Combine all transcript segments
    const transcript = data.results
      .map(result => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    // Save to database
    await updateTranscript(noteId, transcript, 'done');

    return transcript;

  } catch (error) {
    console.error('Transcription error:', error);
    await updateTranscriptStatus(noteId, 'error');
    throw error;
  }
}

// Alternative: Use Google Cloud Speech-to-Text V2 API (latest)
export async function transcribeAudioV2(
  noteId: string,
  audioUri: string
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  try {
    await updateTranscriptStatus(noteId, 'pending');

    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // V2 API endpoint
    const V2_API_URL = 'https://speech.googleapis.com/v2/projects/-/locations/global/recognizers/_:recognize';

    const response = await fetch(`${V2_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          autoDecodingConfig: {}, // Auto-detect audio format
          languageCodes: ['en-US', 'es-ES', 'fr-FR'],
          model: 'chirp',
          features: {
            enableAutomaticPunctuation: true,
          },
        },
        content: audioBase64,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const transcript = data.results
      ?.map((r: any) => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim() || '[No speech detected]';

    await updateTranscript(noteId, transcript, 'done');
    return transcript;

  } catch (error) {
    console.error('Transcription V2 error:', error);
    await updateTranscriptStatus(noteId, 'error');
    throw error;
  }
}

// Retry logic for failed transcriptions
export async function retryTranscription(
  noteId: string,
  audioUri: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeAudio(noteId, audioUri);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Transcription attempt ${attempt} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error('Transcription failed after retries');
}
```

---

## Transcription Hook

**File: `hooks/useTranscription.ts`**

```typescript
import { useCallback, useState } from 'react';
import { transcribeAudio, retryTranscription } from '@/services/transcription';

interface UseTranscriptionResult {
  transcribe: (noteId: string, audioUri: string) => Promise<string | null>;
  isTranscribing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTranscription(): UseTranscriptionResult {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async (
    noteId: string,
    audioUri: string
  ): Promise<string | null> => {
    setIsTranscribing(true);
    setError(null);

    try {
      const transcript = await retryTranscription(noteId, audioUri);
      return transcript;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Transcription failed';
      setError(message);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    transcribe,
    isTranscribing,
    error,
    clearError,
  };
}
```

---

## Audio Format Considerations

Google Speech-to-Text works best with:
- **FLAC**: Lossless, best quality
- **LINEAR16**: Uncompressed WAV
- **MP3**: Lossy but widely supported

Since expo-av records in M4A (AAC), we have two options:

### Option 1: Use M4A directly (simpler)
Google can handle M4A with `MP3` encoding setting.

### Option 2: Convert to FLAC (better quality)
Would require native module or server-side conversion.

**Recommendation for MVP**: Use M4A directly.

---

## UI Components

### Status Chip

**File: `components/StatusChip.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TranscriptStatus } from '@/types';

interface StatusChipProps {
  status: TranscriptStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = {
    pending: { label: 'Transcribing...', color: '#FF9500', showSpinner: true },
    done: { label: 'Done', color: '#34C759', showSpinner: false },
    error: { label: 'Error', color: '#FF3B30', showSpinner: false },
  };

  const { label, color, showSpinner } = config[status];

  return (
    <View style={[styles.chip, { backgroundColor: `${color}20` }]}>
      {showSpinner && (
        <ActivityIndicator size="small" color={color} style={styles.spinner} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spinner: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### Retry Button

**File: `components/RetryButton.tsx`**

```typescript
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface RetryButtonProps {
  onRetry: () => void;
  isLoading?: boolean;
}

export function RetryButton({ onRetry, isLoading }: RetryButtonProps) {
  return (
    <Pressable
      style={styles.button}
      onPress={onRetry}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <>
          <FontAwesome name="refresh" size={14} color="#007AFF" />
          <Text style={styles.text}>Retry</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  text: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
```

---

## Integration Flow

```typescript
// After recording stops
const handleStop = async () => {
  const result = await stopRecording();
  if (result) {
    // 1. Create note in database (status: pending)
    const note = await addNote({
      id: uuid(),
      audioUri: result.uri,
      durationMs: result.durationMs,
      createdAt: Date.now(),
    });

    // 2. Start transcription automatically
    transcribe(note.id, result.uri).then((transcript) => {
      if (transcript) {
        // Update local state
        updateNote(note.id, {
          transcript,
          transcriptStatus: 'done'
        });
      }
    });
  }
};
```

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| No API key | "Transcription not configured" | Show setup instructions |
| Network error | "No internet connection" | Retry button |
| File too large | "Recording too long (max 10MB)" | Suggest shorter recordings |
| API error 429 | "Too many requests, try again" | Auto-retry with backoff |
| API error 400 | "Audio format not supported" | Check encoding settings |
| No speech detected | Show "[No speech detected]" | Allow retry |

---

## Google Cloud Setup

### Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable "Cloud Speech-to-Text API"
4. Create API key (restrict to Speech-to-Text API)

### API Key Restrictions (Recommended)
- Restrict to Speech-to-Text API
- Add app bundle ID restrictions
- Set quota limits

---

## Verification Checklist

- [ ] Transcription triggers automatically after recording
- [ ] Status shows "Transcribing..." while in progress
- [ ] Successful transcription updates status to "Done"
- [ ] Failed transcription shows "Error" with retry option
- [ ] Retry button triggers new transcription attempt
- [ ] Transcript text appears in note detail
- [ ] Audio under 10MB works correctly
- [ ] Network errors are handled gracefully
- [ ] API key missing shows helpful error
- [ ] Empty audio shows "[No speech detected]"

---

## Next Phase
[Phase 6: UI Screens](./PLAN_06_UI_SCREENS.md)
