import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useThemeColor';

interface LevelMeterProps {
  level: number; // 0-1
  barCount?: number;
}

export function LevelMeter({ level, barCount = 20 }: LevelMeterProps) {
  const colors = useColors();

  const bars = Array.from({ length: barCount }, (_, i) => {
    const threshold = i / barCount;
    const isActive = level > threshold;
    const isHigh = i > barCount * 0.7;

    return (
      <View
        key={i}
        style={[
          styles.bar,
          { backgroundColor: colors.trackInactive },
          isActive && { backgroundColor: colors.levelNormal, height: 30 },
          isHigh && isActive && { backgroundColor: colors.levelHigh },
        ]}
      />
    );
  });

  return <View style={styles.container}>{bars}</View>;
}

// Alternative: Single animated bar
export function AnimatedLevelBar({ level }: { level: number }) {
  const colors = useColors();

  return (
    <View style={[styles.barContainer, { backgroundColor: colors.trackInactive }]}>
      <View
        style={[
          styles.barFill,
          { width: `${level * 100}%`, backgroundColor: colors.levelNormal },
        ]}
      />
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
    borderRadius: 2,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
