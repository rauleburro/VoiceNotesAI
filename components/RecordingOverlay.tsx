import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LevelMeter } from './LevelMeter';
import { formatDuration } from '@/utils/format';

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

          <Pressable style={styles.stopButton} onPress={onStop} testID="stop-button">
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
