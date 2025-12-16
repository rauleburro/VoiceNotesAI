import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { VoiceNote, AIAssistResult } from '@/types';
import { getNoteById, updateNoteTranscript, deleteNote } from '@/services/database';
import { deleteRecordingFile } from '@/services/recording';
import { useNotesContext } from '@/contexts/NotesContext';

interface UseNoteDetailResult {
  note: VoiceNote | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  remove: () => Promise<void>;
  updateTranscript: (transcript: string) => Promise<void>;
  updateAIAssist: (result: AIAssistResult) => void;
}

export function useNoteDetail(noteId: string | undefined): UseNoteDetailResult {
  const [note, setNote] = useState<VoiceNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { updateNote, removeNote, refreshNote } = useNotesContext();

  // Load note
  useEffect(() => {
    if (!noteId) {
      setIsLoading(false);
      setError('Note ID not provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    getNoteById(noteId)
      .then((loadedNote) => {
        setNote(loadedNote);
        if (!loadedNote) {
          setError('Note not found');
        }
      })
      .catch((e) => {
        console.error('Error loading note:', e);
        setError('Failed to load note');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [noteId]);

  const refresh = useCallback(async () => {
    if (!noteId) return;

    try {
      const refreshedNote = await getNoteById(noteId);
      setNote(refreshedNote);
    } catch (e) {
      console.error('Error refreshing note:', e);
    }
  }, [noteId]);

  const remove = useCallback(async () => {
    if (!note) return;

    return new Promise<void>((resolve, reject) => {
      Alert.alert(
        'Delete Note',
        'Are you sure you want to delete this voice note? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Cancelled')) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRecordingFile(note.audioUri);
                await deleteNote(note.id);
                removeNote(note.id);
                resolve();
              } catch (e) {
                console.error('Error deleting note:', e);
                reject(e);
              }
            },
          },
        ]
      );
    });
  }, [note, removeNote]);

  const updateTranscript = useCallback(async (transcript: string) => {
    if (!note || transcript === note.transcript) return;

    try {
      await updateNoteTranscript(note.id, transcript);
      setNote(prev => prev ? { ...prev, transcript } : null);
      updateNote(note.id, { transcript });
    } catch (e) {
      console.error('Error updating transcript:', e);
      throw e;
    }
  }, [note, updateNote]);

  const updateAIAssist = useCallback((result: AIAssistResult) => {
    if (!note) return;

    setNote(prev => prev ? {
      ...prev,
      summary: result.summary,
      keyPoints: result.keyPoints,
      titleSuggestion: result.titleSuggestion,
      aiAssistStatus: 'done',
    } : null);

    refreshNote(note.id);
  }, [note, refreshNote]);

  return {
    note,
    isLoading,
    error,
    refresh,
    remove,
    updateTranscript,
    updateAIAssist,
  };
}
