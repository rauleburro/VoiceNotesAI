import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { VoiceNote } from '@/types';
import { useColors } from '@/hooks/useThemeColor';
import { StatusChip } from './StatusChip';

interface NoteCardProps {
  note: VoiceNote;
  onPress: () => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getExcerpt(text: string | null, maxLength: number = 80): string {
  if (!text) return 'No transcript yet...';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function NoteCard({ note, onPress }: NoteCardProps) {
  const colors = useColors();
  const title = note.titleSuggestion || formatDate(note.createdAt);

  return (
    <Pressable
      testID="note-card"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.cardBackground },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <StatusChip status={note.transcriptStatus} />
      </View>

      <Text testID="transcript-excerpt" style={[styles.excerpt, { color: colors.textSecondary }]} numberOfLines={2}>
        {getExcerpt(note.transcript)}
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: colors.textTertiary }]}>
          {formatDate(note.createdAt)}
        </Text>
        <Text style={[styles.meta, { color: colors.textTertiary }]}>
          {formatDuration(note.durationMs)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  excerpt: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    fontSize: 13,
  },
});
