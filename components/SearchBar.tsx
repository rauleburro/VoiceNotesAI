import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChangeText, onClear }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <FontAwesome name="search" size={16} color="#999" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search transcripts..."
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8}>
          <FontAwesome name="times-circle" size={18} color="#999" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
});
