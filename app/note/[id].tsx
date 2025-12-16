import { AIAssistSection } from '@/components/AIAssistSection';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioRouteToggle } from '@/components/AudioRouteToggle';
import { RetryButton } from '@/components/RetryButton';
import { StatusChip } from '@/components/StatusChip';
import { useNotesContext } from '@/contexts/NotesContext';
import { useAIAssist } from '@/hooks/useAIAssist';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useColors } from '@/hooks/useThemeColor';
import { useTranscription } from '@/hooks/useTranscription';
import { deleteNote, getNoteById, updateNoteTranscript } from '@/services/database';
import { deleteRecordingFile } from '@/services/recording';
import { VoiceNote } from '@/types';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { updateNote, removeNote, refreshNote } = useNotesContext();

  const [note, setNote] = useState<VoiceNote | null>(null);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { transcribe, isTranscribing } = useTranscription();
  const { runAIAssist, isProcessing: isAIProcessing } = useAIAssist();
  const player = useAudioPlayer();

  // Load note
  useEffect(() => {
    if (id) {
      getNoteById(id).then((n) => {
        setNote(n);
        setEditedTranscript(n?.transcript || '');
      });
    }
  }, [id]);

  const handleRetryTranscription = useCallback(async () => {
    if (!note) return;

    const transcript = await transcribe(note.id, note.audioUri);
    if (transcript) {
      setNote(prev => prev ? { ...prev, transcript, transcriptStatus: 'done' } : null);
      setEditedTranscript(transcript);
      updateNote(note.id, { transcript, transcriptStatus: 'done' });
    }
  }, [note, transcribe, updateNote]);

  const handleSaveTranscript = useCallback(async () => {
    if (!note || editedTranscript === note.transcript) {
      setIsEditing(false);
      return;
    }

    await updateNoteTranscript(note.id, editedTranscript);
    setNote(prev => prev ? { ...prev, transcript: editedTranscript } : null);
    updateNote(note.id, { transcript: editedTranscript });
    setIsEditing(false);
  }, [note, editedTranscript, updateNote]);

  const handleAIAssist = useCallback(async () => {
    if (!note?.transcript) return;

    const result = await runAIAssist(note.id, note.transcript);
    if (result) {
      setNote(prev => prev ? {
        ...prev,
        summary: result.summary,
        keyPoints: result.keyPoints,
        titleSuggestion: result.titleSuggestion,
        aiAssistStatus: 'done',
      } : null);
      refreshNote(note.id);
    }
  }, [note, runAIAssist, refreshNote]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this voice note? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (note) {
              await deleteRecordingFile(note.audioUri);
              await deleteNote(note.id);
              removeNote(note.id);
              router.back();
            }
          },
        },
      ]
    );
  }, [note, removeNote, router]);

  if (!note) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading note...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: note.titleSuggestion || 'Note',
          headerRight: () => (
            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              accessibilityLabel="Delete note"
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                width: 36,
                height: 36,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              })}
            >
              <FontAwesome name="trash-o" size={18} color={colors.error} />
            </Pressable>
          ),
        }}
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transcript</Text>
            <View style={styles.sectionActions}>
              <StatusChip status={note.transcriptStatus} />
              {note.transcriptStatus === 'error' && (
                <RetryButton onRetry={handleRetryTranscription} isLoading={isTranscribing} />
              )}
              {note.transcriptStatus === 'done' && !isEditing && (
                <Pressable onPress={() => setIsEditing(true)} accessibilityLabel="Edit transcript">
                  <FontAwesome name="edit" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          {isEditing ? (
            <View>
              <TextInput
                style={[
                  styles.transcriptInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={editedTranscript}
                onChangeText={setEditedTranscript}
                multiline
                autoFocus
                placeholderTextColor={colors.placeholder}
              />
              <View style={styles.editActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => {
                    setEditedTranscript(note.transcript || '');
                    setIsEditing(false);
                  }}
                >
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveTranscript}
                >
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={[styles.transcript, { color: colors.textPrimary }]}>
              {note.transcript || 'Transcript not available'}
            </Text>
          )}
        </View>

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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transcript: {
    fontSize: 16,
    lineHeight: 24,
  },
  transcriptInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  editButton: {
    padding: 12,
  },
  cancelText: {
    fontSize: 16,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
