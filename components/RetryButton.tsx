import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface RetryButtonProps {
  onRetry: () => void;
  isLoading?: boolean;
}

export function RetryButton({ onRetry, isLoading }: RetryButtonProps) {
  return (
    <Pressable
      style={styles.button}
      onPress={onRetry}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <>
          <FontAwesome name="refresh" size={14} color="#007AFF" />
          <Text style={styles.text}>Retry</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  text: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
