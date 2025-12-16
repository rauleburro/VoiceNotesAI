import { useState, useCallback, useEffect } from 'react';

interface UseTranscriptEditorResult {
  editedTranscript: string;
  setEditedTranscript: (transcript: string) => void;
  isEditing: boolean;
  isSaving: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  saveTranscript: () => Promise<void>;
}

export function useTranscriptEditor(
  initialTranscript: string,
  onSave: (transcript: string) => Promise<void>
): UseTranscriptEditorResult {
  const [editedTranscript, setEditedTranscript] = useState(initialTranscript);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update edited transcript when initial changes
  useEffect(() => {
    if (!isEditing) {
      setEditedTranscript(initialTranscript);
    }
  }, [initialTranscript, isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditedTranscript(initialTranscript);
    setIsEditing(false);
  }, [initialTranscript]);

  const saveTranscript = useCallback(async () => {
    if (editedTranscript === initialTranscript) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedTranscript);
      setIsEditing(false);
    } catch (e) {
      console.error('Error saving transcript:', e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [editedTranscript, initialTranscript, onSave]);

  return {
    editedTranscript,
    setEditedTranscript,
    isEditing,
    isSaving,
    startEditing,
    cancelEditing,
    saveTranscript,
  };
}
