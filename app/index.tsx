import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useNotesContext } from '@/contexts/NotesContext';
import { useRecording } from '@/hooks/useRecording';
import { useTranscription } from '@/hooks/useTranscription';
import { useSearch } from '@/hooks/useSearch';
import { NoteCard } from '@/components/NoteCard';
import { SearchBar } from '@/components/SearchBar';
import { RecordButton } from '@/components/RecordButton';
import { RecordingOverlay } from '@/components/RecordingOverlay';
import { EmptyState } from '@/components/EmptyState';
import { VoiceNote } from '@/types';

export default function NotesListScreen() {
  const router = useRouter();
  const { notes, loading, loadNotes, addNote, updateNote } = useNotesContext();
  const { state, durationMs, level, startRecording, stopRecording, cancelRecording } = useRecording();
  const { transcribe } = useTranscription();
  const { query, setQuery, clearSearch, displayedNotes, isFiltered } = useSearch(notes);

  const handleRecordPress = useCallback(async () => {
    if (state === 'idle') {
      await startRecording();
    }
  }, [state, startRecording]);

  const handleStop = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      const noteId = randomUUID();
      await addNote({
        id: noteId,
        audioUri: result.uri,
        durationMs: result.durationMs,
        createdAt: Date.now(),
      });

      // Start transcription in background
      transcribe(noteId, result.uri).then((transcript) => {
        if (transcript) {
          updateNote(noteId, { transcript, transcriptStatus: 'done' });
        } else {
          updateNote(noteId, { transcriptStatus: 'error' });
        }
      });
    }
  }, [stopRecording, addNote, transcribe, updateNote]);

  const handleNotePress = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: VoiceNote }) => (
    <NoteCard
      note={item}
      onPress={() => handleNotePress(item.id)}
    />
  ), [handleNotePress]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (isFiltered) {
      return (
        <EmptyState
          icon="search"
          title="No results found"
          message={`No notes match "${query}"`}
          action={{ label: 'Clear search', onPress: clearSearch }}
        />
      );
    }

    return (
      <EmptyState
        icon="microphone"
        title="No voice notes yet"
        message="Tap the microphone button to record your first note"
      />
    );
  }, [loading, isFiltered, query, clearSearch]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onClear={clearSearch}
      />

      {/* Notes list */}
      <FlatList
        data={displayedNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={displayedNotes.length === 0 ? styles.emptyList : undefined}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotes} />
        }
      />

      {/* Record button */}
      <View style={styles.recordContainer}>
        <RecordButton
          isRecording={state === 'recording'}
          onPress={handleRecordPress}
          disabled={state === 'stopping'}
        />
      </View>

      {/* Recording overlay */}
      {state === 'recording' && (
        <RecordingOverlay
          durationMs={durationMs}
          level={level}
          onStop={handleStop}
          onCancel={cancelRecording}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyList: {
    flex: 1,
  },
  recordContainer: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
  },
});
