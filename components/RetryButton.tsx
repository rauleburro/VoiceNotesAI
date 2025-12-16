import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColor';

interface RetryButtonProps {
  onRetry: () => void;
  isLoading?: boolean;
}

export function RetryButton({ onRetry, isLoading }: RetryButtonProps) {
  const colors = useColors();

  return (
    <Pressable
      style={styles.button}
      onPress={onRetry}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          <FontAwesome name="refresh" size={14} color={colors.primary} />
          <Text style={[styles.text, { color: colors.primary }]}>Retry</Text>
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
    fontSize: 14,
    fontWeight: '500',
  },
});
