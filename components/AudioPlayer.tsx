import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { formatDuration } from '@/utils/format';

interface AudioPlayerProps {
  uri: string;
  durationMs: number;
  player: UseAudioPlayerResult;
}

export function AudioPlayer({ uri, durationMs, player }: AudioPlayerProps) {
  const {
    isPlaying,
    isLoaded,
    positionMs,
    durationMs: loadedDuration,
    load,
    play,
    pause,
    seekTo,
    unload,
  } = player;

  useEffect(() => {
    load(uri);
    return () => {
      unload();
    };
  }, [uri, load, unload]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  const actualDuration = loadedDuration || durationMs;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.playButton}
        onPress={handlePlayPause}
        disabled={!isLoaded}
      >
        <FontAwesome
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={isLoaded ? '#007AFF' : '#CCC'}
        />
      </Pressable>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={actualDuration}
          value={positionMs}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#007AFF"
          disabled={!isLoaded}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatDuration(positionMs)}</Text>
          <Text style={styles.time}>{formatDuration(actualDuration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sliderContainer: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
});
