import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { VoiceNote } from '@/types';
import { NoteCard } from '@/components/ui';

interface NotesListProps {
  notes: VoiceNote[];
}

export function NotesList({ notes }: NotesListProps) {
  const router = useRouter();

  const handleNotePress = (noteId: string) => {
    router.push(`/note/${noteId}`);
  };

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <NoteCard
          note={item}
          onPress={() => handleNotePress(item.id)}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
});
