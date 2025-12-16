import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LevelMeter } from './LevelMeter';
import { formatDuration } from '@/utils/format';
import { useColors } from '@/hooks/useThemeColor';

interface RecordingOverlayProps {
  durationMs: number;
  level: number;
  onStop: () => void;
  onCancel: () => void;
}

export function RecordingOverlay({
  durationMs,
  level,
  onStop,
  onCancel,
}: RecordingOverlayProps) {
  const colors = useColors();

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlayDark }]}>
      <View style={styles.content}>
        {/* Recording indicator */}
        <View style={styles.recordingIndicator}>
          <View style={[styles.redDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.recordingText, { color: colors.error }]}>Recording</Text>
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
            <FontAwesome name="times" size={24} color={colors.textTertiary} />
            <Text style={[styles.cancelText, { color: colors.textTertiary }]}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.stopButton, { backgroundColor: colors.error }]}
            onPress={onStop}
            testID="stop-button"
          >
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
    marginRight: 8,
  },
  recordingText: {
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
    fontSize: 12,
    marginTop: 4,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 60,
  },
});
