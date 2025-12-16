import { useState, useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioEvents } from 'expo-audio';

export interface UseAudioPlayerResult {
  isPlaying: boolean;
  isLoaded: boolean;
  positionMs: number;
  durationMs: number;
  error: string | null;
  load: (uri: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  unload: () => Promise<void>;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const handlePlaybackStatus = useCallback((status: Parameters<AudioEvents['playbackStatusUpdate']>[0]) => {
    setIsLoaded(status.isLoaded);
    setIsPlaying(status.playing);
    // Convert seconds to milliseconds for backward compatibility
    setPositionMs(Math.round(status.currentTime * 1000));
    setDurationMs(Math.round(status.duration * 1000));

    // Reset position when playback finishes
    if (status.currentTime >= status.duration && status.duration > 0 && !status.playing) {
      setPositionMs(0);
    }
  }, []);

  const load = useCallback(async (uri: string) => {
    try {
      setError(null);

      // Clean up existing player
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      // Configure audio mode for playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionModeAndroid: 'duckOthers',
      });

      // Create player with the audio source
      const player = createAudioPlayer({ uri }, { updateInterval: 100 });
      playerRef.current = player;

      // Subscribe to status updates
      listenerRef.current = player.addListener('playbackStatusUpdate', handlePlaybackStatus);

    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load audio';
      setError(message);
    }
  }, [handlePlaybackStatus]);

  const play = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      // If playback finished, seek to start first
      const player = playerRef.current;
      if (player.currentTime >= player.duration && player.duration > 0) {
        await player.seekTo(0);
      }
      player.play();
    } catch (e) {
      setError('Failed to play audio');
    }
  }, []);

  const pause = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.pause();
    } catch (e) {
      setError('Failed to pause audio');
    }
  }, []);

  const stop = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.pause();
      await playerRef.current.seekTo(0);
    } catch (e) {
      setError('Failed to stop audio');
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    if (!playerRef.current) return;
    try {
      // Convert milliseconds to seconds
      await playerRef.current.seekTo(position / 1000);
    } catch (e) {
      setError('Failed to seek audio');
    }
  }, []);

  const unload = useCallback(async () => {
    if (listenerRef.current) {
      listenerRef.current.remove();
      listenerRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.remove();
        playerRef.current = null;
        setIsLoaded(false);
        setIsPlaying(false);
        setPositionMs(0);
        setDurationMs(0);
      } catch (e) {
        console.error('Error unloading player:', e);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        listenerRef.current.remove();
      }
      if (playerRef.current) {
        playerRef.current.remove();
      }
    };
  }, []);

  return {
    isPlaying,
    isLoaded,
    positionMs,
    durationMs,
    error,
    load,
    play,
    pause,
    stop,
    seekTo,
    unload,
  };
}
