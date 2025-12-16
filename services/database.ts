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
function rowToVoiceNote(row: Record<string, unknown>): VoiceNote {
  return {
    id: row.id as string,
    audioUri: row.audio_uri as string,
    durationMs: row.duration_ms as number,
    createdAt: row.created_at as number,
    transcript: row.transcript as string | null,
    transcriptStatus: row.transcript_status as TranscriptStatus,
    summary: row.summary as string | null,
    keyPoints: row.key_points ? JSON.parse(row.key_points as string) : null,
    titleSuggestion: row.title_suggestion as string | null,
    aiAssistStatus: row.ai_assist_status as AIAssistStatus,
  };
}

// CRUD Operations

export async function createNote(
  note: Omit<VoiceNote, 'transcript' | 'transcriptStatus' | 'summary' | 'keyPoints' | 'titleSuggestion' | 'aiAssistStatus'>
): Promise<VoiceNote> {
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
  return rows.map((row) => rowToVoiceNote(row as Record<string, unknown>));
}

export async function getNoteById(id: string): Promise<VoiceNote | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM voice_notes WHERE id = ?',
    [id]
  );
  return row ? rowToVoiceNote(row as Record<string, unknown>) : null;
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
  return rows.map((row) => rowToVoiceNote(row as Record<string, unknown>));
}
