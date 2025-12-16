import { useNotesContext } from '@/contexts/NotesContext';
import { VoiceNote } from '@/types';

interface UseNotesListResult {
  notes: VoiceNote[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addNote: (note: Omit<VoiceNote, 'transcript' | 'transcriptStatus' | 'summary' | 'keyPoints' | 'titleSuggestion' | 'aiAssistStatus'>) => Promise<VoiceNote>;
  removeNote: (id: string) => Promise<void>;
}

export function useNotesList(): UseNotesListResult {
  const { notes, loading, error, loadNotes, addNote, removeNote } = useNotesContext();

  return {
    notes,
    isLoading: loading,
    error,
    refresh: loadNotes,
    addNote,
    removeNote,
  };
}
