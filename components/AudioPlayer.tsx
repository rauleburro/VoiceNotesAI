import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { formatDuration } from '@/utils/format';
import { useColors } from '@/hooks/useThemeColor';

interface AudioPlayerProps {
  uri: string;
  durationMs: number;
  player: UseAudioPlayerResult;
}

export function AudioPlayer({ uri, durationMs, player }: AudioPlayerProps) {
  const colors = useColors();
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
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary }]}>
      <Pressable
        style={[styles.playButton, { backgroundColor: colors.primary + '20' }]}
        onPress={handlePlayPause}
        disabled={!isLoaded}
      >
        <FontAwesome
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={isLoaded ? colors.primary : colors.icon}
        />
      </Pressable>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={actualDuration}
          value={positionMs}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={colors.trackActive}
          maximumTrackTintColor={colors.trackInactive}
          thumbTintColor={colors.primary}
          disabled={!isLoaded}
        />
        <View style={styles.timeContainer}>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {formatDuration(positionMs)}
          </Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {formatDuration(actualDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
});
