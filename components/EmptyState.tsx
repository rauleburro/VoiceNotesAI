import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <FontAwesome name={icon} size={48} color="#CCC" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <Pressable style={styles.button} onPress={action.onPress}>
          <Text style={styles.buttonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
