import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TranscriptStatus } from '@/types';
import { useColors } from '@/hooks/useThemeColor';

interface StatusChipProps {
  status: TranscriptStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const colors = useColors();

  const config = {
    pending: { label: 'Transcribing...', color: colors.statusPending, showSpinner: true },
    done: { label: 'Done', color: colors.statusDone, showSpinner: false },
    error: { label: 'Error', color: colors.statusError, showSpinner: false },
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
