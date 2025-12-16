import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { VoiceNote } from '@/types';
import * as db from '@/services/database';

interface NotesContextType {
  notes: VoiceNote[];
  loading: boolean;
  error: string | null;
  loadNotes: () => Promise<void>;
  addNote: (note: Omit<VoiceNote, 'transcript' | 'transcriptStatus' | 'summary' | 'keyPoints' | 'titleSuggestion' | 'aiAssistStatus'>) => Promise<VoiceNote>;
  updateNote: (id: string, updates: Partial<VoiceNote>) => void;
  removeNote: (id: string) => Promise<void>;
  refreshNote: (id: string) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const allNotes = await db.getAllNotes();
      setNotes(allNotes);
      setError(null);
    } catch (e) {
      setError('Failed to load notes');
      console.error('Error loading notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(async (
    note: Omit<VoiceNote, 'transcript' | 'transcriptStatus' | 'summary' | 'keyPoints' | 'titleSuggestion' | 'aiAssistStatus'>
  ) => {
    const newNote = await db.createNote(note);
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<VoiceNote>) => {
    setNotes(prev => prev.map(note =>
      note.id === id ? { ...note, ...updates } : note
    ));
  }, []);

  const removeNote = useCallback(async (id: string) => {
    await db.deleteNote(id);
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const refreshNote = useCallback(async (id: string) => {
    const note = await db.getNoteById(id);
    if (note) {
      setNotes(prev => prev.map(n => n.id === id ? note : n));
    }
  }, []);

  return (
    <NotesContext.Provider
      value={{
        notes,
        loading,
        error,
        loadNotes,
        addNote,
        updateNote,
        removeNote,
        refreshNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotesContext() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotesContext must be used within NotesProvider');
  }
  return context;
}
