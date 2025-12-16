import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TranscriptStatus } from '@/types';

interface StatusChipProps {
  status: TranscriptStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = {
    pending: { label: 'Transcribing...', color: '#FF9500', showSpinner: true },
    done: { label: 'Done', color: '#34C759', showSpinner: false },
    error: { label: 'Error', color: '#FF3B30', showSpinner: false },
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
