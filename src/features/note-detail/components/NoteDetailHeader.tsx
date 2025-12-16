import React from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useColors } from '@/hooks/useThemeColor';

interface NoteDetailHeaderProps {
  title: string | null;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function NoteDetailHeader({ title, onDelete, isDeleting }: NoteDetailHeaderProps) {
  const colors = useColors();

  return (
    <Stack.Screen
      options={{
        title: title || 'Note',
        headerRight: () => (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            accessibilityLabel="Delete note"
            disabled={isDeleting}
            style={({ pressed }) => ({
              opacity: pressed || isDeleting ? 0.6 : 1,
              width: 36,
              height: 36,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <FontAwesome name="trash-o" size={18} color={colors.error} />
            )}
          </Pressable>
        ),
      }}
    />
  );
}
