# Phase 3: Data Layer

## Objective
Set up SQLite database for persisting voice notes, transcripts, and AI outputs.

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS voice_notes (
  id TEXT PRIMARY KEY,
  audio_uri TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  transcript TEXT,
  transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'done', 'error')),
  summary TEXT,
  key_points TEXT,
  title_suggestion TEXT,
  ai_assist_status TEXT DEFAULT 'none' CHECK (ai_assist_status IN ('none', 'pending', 'done', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_created_at ON voice_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_status ON voice_notes(transcript_status);
```

---

## Implementation

### Database Service

**File: `services/database.ts`**

```typescript
import * as SQLite from 'expo-sqlite';
import { VoiceNote, TranscriptStatus, AIAssistStatus } from '@/types';

const DATABASE_NAME = 'voicenotes.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS voice_notes (
      id TEXT PRIMARY KEY,
      audio_uri TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      transcript TEXT,
      transcript_status TEXT DEFAULT 'pending',
      summary TEXT,
      key_points TEXT,
      title_suggestion TEXT,
      ai_assist_status TEXT DEFAULT 'none'
    );

    CREATE INDEX IF NOT EXISTS idx_created_at ON voice_notes(created_at DESC);
  `);
}

// Convert DB row to VoiceNote
function rowToVoiceNote(row: any): VoiceNote {
  return {
    id: row.id,
    audioUri: row.audio_uri,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    transcript: row.transcript,
    transcriptStatus: row.transcript_status as TranscriptStatus,
    summary: row.summary,
    keyPoints: row.key_points ? JSON.parse(row.key_points) : null,
    titleSuggestion: row.title_suggestion,
    aiAssistStatus: row.ai_assist_status as AIAssistStatus,
  };
}

// CRUD Operations

export async function createNote(note: Omit<VoiceNote, 'transcript' | 'transcriptStatus' | 'summary' | 'keyPoints' | 'titleSuggestion' | 'aiAssistStatus'>): Promise<VoiceNote> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO voice_notes (id, audio_uri, duration_ms, created_at, transcript_status, ai_assist_status)
     VALUES (?, ?, ?, ?, 'pending', 'none')`,
    [note.id, note.audioUri, note.durationMs, note.createdAt]
  );

  return {
    ...note,
    transcript: null,
    transcriptStatus: 'pending',
    summary: null,
    keyPoints: null,
    titleSuggestion: null,
    aiAssistStatus: 'none',
  };
}

export async function getAllNotes(): Promise<VoiceNote[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT * FROM voice_notes ORDER BY created_at DESC'
  );
  return rows.map(rowToVoiceNote);
}

export async function getNoteById(id: string): Promise<VoiceNote | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM voice_notes WHERE id = ?',
    [id]
  );
  return row ? rowToVoiceNote(row) : null;
}

export async function updateTranscript(
  id: string,
  transcript: string,
  status: TranscriptStatus
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE voice_notes SET transcript = ?, transcript_status = ? WHERE id = ?',
    [transcript, status, id]
  );
}

export async function updateTranscriptStatus(
  id: string,
  status: TranscriptStatus
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE voice_notes SET transcript_status = ? WHERE id = ?',
    [status, id]
  );
}

export async function updateAIAssist(
  id: string,
  summary: string,
  keyPoints: string[],
  titleSuggestion: string | null
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE voice_notes
     SET summary = ?, key_points = ?, title_suggestion = ?, ai_assist_status = 'done'
     WHERE id = ?`,
    [summary, JSON.stringify(keyPoints), titleSuggestion, id]
  );
}

export async function updateAIAssistStatus(
  id: string,
  status: AIAssistStatus
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE voice_notes SET ai_assist_status = ? WHERE id = ?',
    [status, id]
  );
}

export async function updateNoteTranscript(
  id: string,
  transcript: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE voice_notes SET transcript = ? WHERE id = ?',
    [transcript, id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM voice_notes WHERE id = ?', [id]);
}

export async function searchNotes(query: string): Promise<VoiceNote[]> {
  const database = await getDatabase();
  const searchTerm = `%${query}%`;
  const rows = await database.getAllAsync(
    `SELECT * FROM voice_notes
     WHERE transcript LIKE ? OR title_suggestion LIKE ?
     ORDER BY created_at DESC`,
    [searchTerm, searchTerm]
  );
  return rows.map(rowToVoiceNote);
}
```

---

## React Hook for Notes

**File: `hooks/useNotes.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { VoiceNote } from '@/types';
import * as db from '@/services/database';

export function useNotes() {
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(async (note: Parameters<typeof db.createNote>[0]) => {
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

  return {
    notes,
    loading,
    error,
    loadNotes,
    addNote,
    updateNote,
    removeNote,
    refreshNote,
  };
}
```

---

## Search Hook

**File: `hooks/useSearch.ts`**

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceNote } from '@/types';
import * as db from '@/services/database';

const DEBOUNCE_MS = 300;

export function useSearch(allNotes: VoiceNote[]) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VoiceNote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await db.searchNotes(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search
    timeoutRef.current = setTimeout(() => {
      search(newQuery);
    }, DEBOUNCE_MS);
  }, [search]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return filtered notes or all notes
  const displayedNotes = query.trim() ? results : allNotes;

  return {
    query,
    setQuery: handleQueryChange,
    clearSearch,
    isSearching,
    displayedNotes,
    hasResults: results.length > 0,
    isFiltered: query.trim().length > 0,
  };
}
```

---

## Notes Context (Optional)

**File: `contexts/NotesContext.tsx`**

```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { useNotes } from '@/hooks/useNotes';

type NotesContextType = ReturnType<typeof useNotes>;

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const notesState = useNotes();

  return (
    <NotesContext.Provider value={notesState}>
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
```

---

## Verification Checklist

- [ ] Database initializes correctly on first launch
- [ ] createNote() inserts and returns complete VoiceNote
- [ ] getAllNotes() returns notes sorted by createdAt DESC
- [ ] getNoteById() returns correct note or null
- [ ] updateTranscript() updates transcript and status
- [ ] updateAIAssist() updates summary, keyPoints, titleSuggestion
- [ ] deleteNote() removes note from database
- [ ] searchNotes() finds notes by transcript content
- [ ] useNotes hook provides reactive state
- [ ] useSearch debounces queries at 300ms
- [ ] App survives force close and restart (data persists)

---

## Next Phase
[Phase 4: Recording Feature](./PLAN_04_RECORDING.md)
