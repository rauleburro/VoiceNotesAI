# Phase 4: Recording Feature

## Objective
Implement audio recording with live mic level feedback using expo-av and NativeLevelMeter.

---

## Recording Service

**File: `services/recording.ts`**

```typescript
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { v4 as uuid } from 'uuid';

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

let currentRecording: Audio.Recording | null = null;

export async function requestPermissions(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<void> {
  // Request permissions if needed
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    throw new Error('Microphone permission not granted');
  }

  // Configure audio mode
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  // Create and start recording
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  currentRecording = recording;
}

export async function stopRecording(): Promise<RecordingResult> {
  if (!currentRecording) {
    throw new Error('No active recording');
  }

  await currentRecording.stopAndUnloadAsync();

  const uri = currentRecording.getURI();
  const status = await currentRecording.getStatusAsync();

  if (!uri) {
    throw new Error('Recording URI not available');
  }

  // Move to permanent location
  const filename = `recording_${uuid()}.m4a`;
  const permanentUri = `${FileSystem.documentDirectory}recordings/${filename}`;

  // Ensure directory exists
  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}recordings/`,
    { intermediates: true }
  ).catch(() => {}); // Ignore if exists

  await FileSystem.moveAsync({ from: uri, to: permanentUri });

  currentRecording = null;

  // Reset audio mode for playback
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  return {
    uri: permanentUri,
    durationMs: status.durationMillis || 0,
  };
}

export async function cancelRecording(): Promise<void> {
  if (!currentRecording) return;

  try {
    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI();
    if (uri) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.error('Error canceling recording:', e);
  } finally {
    currentRecording = null;
  }
}

export function isRecording(): boolean {
  return currentRecording !== null;
}

export async function deleteRecordingFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
```

---

## Recording Hook

**File: `hooks/useRecording.ts`**

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import * as RecordingService from '@/services/recording';
import NativeLevelMeter from '@/modules/native-level-meter';

export type RecordingState = 'idle' | 'recording' | 'stopping';

export interface UseRecordingResult {
  state: RecordingState;
  durationMs: number;
  level: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingService.RecordingResult | null>;
  cancelRecording: () => Promise<void>;
}

export function useRecording(): UseRecordingResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const levelListenerRef = useRef<{ remove: () => void } | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (levelListenerRef.current) levelListenerRef.current.remove();
      NativeLevelMeter.stop();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setState('recording');
      setDurationMs(0);
      setLevel(0);

      // Start audio recording
      await RecordingService.startRecording();

      // Start duration timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);

      // Start level meter
      levelListenerRef.current = NativeLevelMeter.addListener((newLevel) => {
        setLevel(newLevel);
      });
      NativeLevelMeter.start();

    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : 'Failed to start recording');
      throw e;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording') return null;

    try {
      setState('stopping');

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop level meter
      NativeLevelMeter.stop();
      if (levelListenerRef.current) {
        levelListenerRef.current.remove();
        levelListenerRef.current = null;
      }
      setLevel(0);

      // Stop recording
      const result = await RecordingService.stopRecording();

      setState('idle');
      setDurationMs(0);

      return result;
    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : 'Failed to stop recording');
      return null;
    }
  }, [state]);

  const cancelRecording = useCallback(async () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop level meter
    NativeLevelMeter.stop();
    if (levelListenerRef.current) {
      levelListenerRef.current.remove();
      levelListenerRef.current = null;
    }

    await RecordingService.cancelRecording();

    setState('idle');
    setDurationMs(0);
    setLevel(0);
    setError(null);
  }, []);

  return {
    state,
    durationMs,
    level,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
```

---

## Recording UI Components

### Record Button

**File: `components/RecordButton.tsx`**

```typescript
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled }: RecordButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isRecording && styles.recording,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <FontAwesome
          name={isRecording ? 'stop' : 'microphone'}
          size={32}
          color="white"
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recording: {
    backgroundColor: '#FF3B30',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
```

### Level Meter Visualization

**File: `components/LevelMeter.tsx`**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';

interface LevelMeterProps {
  level: number; // 0-1
  barCount?: number;
}

export function LevelMeter({ level, barCount = 20 }: LevelMeterProps) {
  const bars = Array.from({ length: barCount }, (_, i) => {
    const threshold = i / barCount;
    const isActive = level > threshold;

    return (
      <View
        key={i}
        style={[
          styles.bar,
          isActive && styles.barActive,
          i > barCount * 0.7 && isActive && styles.barHigh,
        ]}
      />
    );
  });

  return <View style={styles.container}>{bars}</View>;
}

// Alternative: Animated bar visualization
export function AnimatedLevelBar({ level }: { level: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${level * 100}%`, {
      damping: 15,
      stiffness: 150,
    }),
  }));

  return (
    <View style={styles.barContainer}>
      <Animated.View style={[styles.barFill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
  },
  bar: {
    width: 4,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: '#4CAF50',
    height: 30,
  },
  barHigh: {
    backgroundColor: '#FF9800',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
});
```

### Recording Overlay

**File: `components/RecordingOverlay.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LevelMeter } from './LevelMeter';

interface RecordingOverlayProps {
  durationMs: number;
  level: number;
  onStop: () => void;
  onCancel: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function RecordingOverlay({
  durationMs,
  level,
  onStop,
  onCancel
}: RecordingOverlayProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Recording indicator */}
        <View style={styles.recordingIndicator}>
          <View style={styles.redDot} />
          <Text style={styles.recordingText}>Recording</Text>
        </View>

        {/* Timer */}
        <Text style={styles.timer}>{formatDuration(durationMs)}</Text>

        {/* Level meter */}
        <View style={styles.levelContainer}>
          <LevelMeter level={level} />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <FontAwesome name="times" size={24} color="#666" />
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Pressable style={styles.stopButton} onPress={onStop}>
            <FontAwesome name="stop" size={32} color="white" />
          </Pressable>

          <View style={styles.placeholder} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    color: 'white',
    fontVariant: ['tabular-nums'],
    marginBottom: 32,
  },
  levelContainer: {
    width: 250,
    marginBottom: 48,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 250,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 60,
  },
});
```

---

## Integration Example

**Usage in main screen:**

```typescript
import { useRecording } from '@/hooks/useRecording';
import { RecordButton } from '@/components/RecordButton';
import { RecordingOverlay } from '@/components/RecordingOverlay';

function NotesListScreen() {
  const { state, durationMs, level, startRecording, stopRecording, cancelRecording } = useRecording();
  const { addNote } = useNotesContext();

  const handleRecordPress = async () => {
    if (state === 'idle') {
      await startRecording();
    }
  };

  const handleStop = async () => {
    const result = await stopRecording();
    if (result) {
      const note = await addNote({
        id: uuid(),
        audioUri: result.uri,
        durationMs: result.durationMs,
        createdAt: Date.now(),
      });
      // Trigger transcription...
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Notes list */}

      {/* Record button */}
      <RecordButton
        isRecording={state === 'recording'}
        onPress={handleRecordPress}
        disabled={state === 'stopping'}
      />

      {/* Recording overlay */}
      {state === 'recording' && (
        <RecordingOverlay
          durationMs={durationMs}
          level={level}
          onStop={handleStop}
          onCancel={cancelRecording}
        />
      )}
    </View>
  );
}
```

---

## Verification Checklist

- [ ] Microphone permission requested and handled
- [ ] Recording starts successfully
- [ ] Duration timer updates smoothly (~100ms)
- [ ] Level meter receives native events (~15Hz)
- [ ] Level values are 0-1 normalized
- [ ] Recording stops and returns file URI + duration
- [ ] File persists in documents directory
- [ ] Cancel recording deletes temporary file
- [ ] UI shows recording state clearly
- [ ] Stop action is obvious and accessible
- [ ] Audio mode correctly switches between record/playback

---

## Next Phase
[Phase 5: Transcription](./PLAN_05_TRANSCRIPTION.md)
