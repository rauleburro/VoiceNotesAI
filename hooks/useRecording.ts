import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import * as RecordingService from '@/services/recording';
import NativeLevelMeter from '@/modules/native-level-meter';
import { RecordingState, RecordingResult } from '@/types';

export interface UseRecordingResult {
  state: RecordingState;
  durationMs: number;
  level: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;
}

export function useRecording(): UseRecordingResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const levelListenerRef = useRef<{ remove: () => void } | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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

      // Request permissions if needed
      const hasPermission = await RecordingService.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode for recording
      await RecordingService.configureAudioModeForRecording();

      // Prepare and start recording
      await recorder.prepareToRecordAsync();
      recorder.record();

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
      const message = e instanceof Error ? e.message : 'Failed to start recording';
      setError(message);
      throw e;
    }
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
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

      // Get final duration before stopping
      const finalDurationMs = Date.now() - startTimeRef.current;

      // Stop recording
      await recorder.stop();

      // Get the recording URL from recorder status
      const status = recorder.getStatus();
      const recordingUrl = status.url || recorder.uri;

      if (!recordingUrl) {
        throw new Error('Recording URI not available');
      }

      // Configure audio mode for playback
      await RecordingService.configureAudioModeForPlayback();

      // Save recording to permanent location
      const result = await RecordingService.saveRecording(recordingUrl, finalDurationMs);

      setState('idle');
      setDurationMs(0);

      return result;
    } catch (e) {
      console.error('Error stopping recording:', e);
      setState('idle');
      const message = e instanceof Error ? e.message : 'Failed to stop recording';
      setError(message);
      return null;
    }
  }, [state, recorder]);

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

    // Stop recording and delete temp file
    try {
      await recorder.stop();
      if (recorder.uri) {
        await RecordingService.deleteRecordingFile(recorder.uri);
      }
    } catch (e) {
      console.error('Error canceling recording:', e);
    }

    setState('idle');
    setDurationMs(0);
    setLevel(0);
    setError(null);
  }, [recorder]);

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
