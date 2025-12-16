import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled }: RecordButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [isRecording, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isRecording && styles.recording,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <FontAwesome
          name={isRecording ? 'stop' : 'microphone'}
          size={32}
          color="white"
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recording: {
    backgroundColor: '#FF3B30',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
