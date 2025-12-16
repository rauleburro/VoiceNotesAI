import React from 'react';
import { View, StyleSheet } from 'react-native';

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

// Alternative: Single animated bar
export function AnimatedLevelBar({ level }: { level: number }) {
  return (
    <View style={styles.barContainer}>
      <View style={[styles.barFill, { width: `${level * 100}%` }]} />
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
