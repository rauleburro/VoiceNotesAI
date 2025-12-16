import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useColors } from '@/hooks/useThemeColor';

// Features
import { useNoteDetail, NoteDetailHeader, TranscriptSection } from '@/features/note-detail';
import { useTranscription } from '@/features/transcription';
import { useAIAssist, AIAssistSection } from '@/features/ai-assist';
import { useAudioPlayer, AudioPlayer, AudioRouteToggle } from '@/features/audio-playback';

// Components
import { LoadingScreen } from '@/components/feedback';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const { note, isLoading, remove, updateTranscript, updateAIAssist } = useNoteDetail(id);
  const { transcribe, isTranscribing } = useTranscription();
  const { runAIAssist, isProcessing: isAIProcessing } = useAIAssist();
  const player = useAudioPlayer();

  const handleRetryTranscription = useCallback(async () => {
    if (!note) return;

    const transcript = await transcribe(note.id, note.audioUri);
    if (transcript) {
      await updateTranscript(transcript);
    }
  }, [note, transcribe, updateTranscript]);

  const handleAIAssist = useCallback(async () => {
    if (!note?.transcript) return;

    const result = await runAIAssist(note.id, note.transcript);
    if (result) {
      updateAIAssist(result);
    }
  }, [note, runAIAssist, updateAIAssist]);

  const handleDelete = useCallback(async () => {
    try {
      await remove();
      router.back();
    } catch {
      // User cancelled or error occurred
    }
  }, [remove, router]);

  // Loading state
  if (isLoading) {
    return <LoadingScreen message="Loading note..." />;
  }

  // Note not found
  if (!note) {
    return <LoadingScreen message="Note not found" />;
  }

  return (
    <>
      <NoteDetailHeader
        title={note.titleSuggestion}
        onDelete={handleDelete}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Audio Player */}
        <View style={styles.section}>
          <AudioPlayer
            uri={note.audioUri}
            durationMs={note.durationMs}
            player={player}
          />
          <AudioRouteToggle />
        </View>

        {/* Transcript */}
        <TranscriptSection
          note={note}
          onTranscriptSaved={updateTranscript}
          onRetryTranscription={handleRetryTranscription}
          isTranscribing={isTranscribing}
        />

        {/* AI Assist */}
        {note.transcriptStatus === 'done' && (
          <AIAssistSection
            note={note}
            onRunAIAssist={handleAIAssist}
            isProcessing={isAIProcessing}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
});
