import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { VoiceNote } from '@/types';
import { useColors } from '@/hooks/useThemeColor';
import { StatusChip, RetryButton } from '@/components/ui';
import { useTranscriptEditor } from '../hooks/useTranscriptEditor';

interface TranscriptSectionProps {
  note: VoiceNote;
  onTranscriptSaved: (transcript: string) => Promise<void>;
  onRetryTranscription: () => void;
  isTranscribing: boolean;
}

export function TranscriptSection({
  note,
  onTranscriptSaved,
  onRetryTranscription,
  isTranscribing,
}: TranscriptSectionProps) {
  const colors = useColors();
  const editor = useTranscriptEditor(note.transcript || '', onTranscriptSaved);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transcript</Text>
        <View style={styles.sectionActions}>
          <StatusChip status={note.transcriptStatus} />
          {note.transcriptStatus === 'error' && (
            <RetryButton onRetry={onRetryTranscription} isLoading={isTranscribing} />
          )}
          {note.transcriptStatus === 'done' && !editor.isEditing && (
            <Pressable onPress={editor.startEditing} accessibilityLabel="Edit transcript">
              <FontAwesome name="edit" size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {editor.isEditing ? (
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
            value={editor.editedTranscript}
            onChangeText={editor.setEditedTranscript}
            multiline
            autoFocus
            placeholderTextColor={colors.placeholder}
          />
          <View style={styles.editActions}>
            <Pressable
              style={styles.editButton}
              onPress={editor.cancelEditing}
              disabled={editor.isSaving}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={editor.saveTranscript}
              disabled={editor.isSaving}
            >
              {editor.isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={[styles.transcript, { color: colors.textPrimary }]}>
          {note.transcript || 'Transcript not available'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    minWidth: 80,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
