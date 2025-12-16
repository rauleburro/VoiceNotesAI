import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { getAudioRoute, setAudioRoute, AudioRoute } from '../../../../modules/native-audio-session';
import { useColors } from '@/hooks/useThemeColor';

export function AudioRouteToggle() {
  const colors = useColors();
  const [currentRoute, setCurrentRoute] = useState<AudioRoute>('speaker');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAudioRoute().then(setCurrentRoute);
  }, []);

  const toggleRoute = useCallback(async () => {
    setIsLoading(true);
    try {
      const newRoute = currentRoute === 'speaker' ? 'earpiece' : 'speaker';
      await setAudioRoute(newRoute);
      setCurrentRoute(newRoute);
    } catch (e) {
      console.error('Failed to toggle audio route:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentRoute]);

  const isSpeaker = currentRoute === 'speaker';

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: colors.primary + '20' },
        isLoading && styles.loading,
      ]}
      onPress={toggleRoute}
      disabled={isLoading}
    >
      <FontAwesome
        name={isSpeaker ? 'volume-up' : 'phone'}
        size={16}
        color={colors.primary}
      />
      <Text style={[styles.label, { color: colors.primary }]}>
        {isSpeaker ? 'Speaker' : 'Earpiece'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 6,
  },
  loading: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
