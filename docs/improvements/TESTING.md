# Plan de Testing

Este documento detalla el plan para mejorar la cobertura de tests en VoiceNotesAI.

---

## Estado Actual

### Tests Existentes

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `__tests__/hooks/useSearch.test.ts` | 6 | Hook de búsqueda |
| `__tests__/utils/format.test.ts` | 12 | Utilidades de formato |
| **Total** | **~18** | **~5%** |

### Áreas Sin Cobertura

- Database operations
- API services (transcription, AI assist)
- Hooks críticos (useRecording, useAudioPlayer, etc.)
- Componentes UI
- Context providers
- Flujos end-to-end

---

## 1. Tests de Base de Datos

### 1.1 CRUD Operations

**Archivo:** `__tests__/services/database.test.ts`

```tsx
import {
  createNote,
  getNoteById,
  getAllNotes,
  deleteNote,
  updateNoteTranscript,
  updateNoteAIAssist
} from '@/services/database';

describe('Database Service', () => {
  beforeEach(async () => {
    // Limpiar DB de test
    await clearTestDatabase();
  });

  describe('createNote', () => {
    it('should create a note with required fields', async () => {
      const note = await createNote({
        audioUri: 'file://test.m4a',
        durationMs: 5000,
      });

      expect(note.id).toBeDefined();
      expect(note.audioUri).toBe('file://test.m4a');
      expect(note.durationMs).toBe(5000);
      expect(note.transcriptStatus).toBe('pending');
      expect(note.aiAssistStatus).toBe('none');
    });

    it('should set createdAt timestamp', async () => {
      const before = Date.now();
      const note = await createNote({ audioUri: 'file://test.m4a', durationMs: 1000 });
      const after = Date.now();

      expect(note.createdAt).toBeGreaterThanOrEqual(before);
      expect(note.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('getNoteById', () => {
    it('should return note when exists', async () => {
      const created = await createNote({ audioUri: 'file://test.m4a', durationMs: 1000 });
      const fetched = await getNoteById(created.id);

      expect(fetched).toEqual(created);
    });

    it('should return null when note does not exist', async () => {
      const result = await getNoteById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAllNotes', () => {
    it('should return empty array when no notes', async () => {
      const notes = await getAllNotes();
      expect(notes).toEqual([]);
    });

    it('should return notes sorted by createdAt desc', async () => {
      const note1 = await createNote({ audioUri: 'file://1.m4a', durationMs: 1000 });
      await delay(10);
      const note2 = await createNote({ audioUri: 'file://2.m4a', durationMs: 1000 });

      const notes = await getAllNotes();
      expect(notes[0].id).toBe(note2.id);
      expect(notes[1].id).toBe(note1.id);
    });
  });

  describe('deleteNote', () => {
    it('should delete existing note', async () => {
      const note = await createNote({ audioUri: 'file://test.m4a', durationMs: 1000 });
      await deleteNote(note.id);

      const result = await getNoteById(note.id);
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent note', async () => {
      await expect(deleteNote('non-existent')).resolves.not.toThrow();
    });
  });

  describe('updateNoteTranscript', () => {
    it('should update transcript and status', async () => {
      const note = await createNote({ audioUri: 'file://test.m4a', durationMs: 1000 });
      await updateNoteTranscript(note.id, 'Hello world');

      const updated = await getNoteById(note.id);
      expect(updated?.transcript).toBe('Hello world');
      expect(updated?.transcriptStatus).toBe('done');
    });
  });

  describe('updateNoteAIAssist', () => {
    it('should update AI fields', async () => {
      const note = await createNote({ audioUri: 'file://test.m4a', durationMs: 1000 });
      await updateNoteAIAssist(note.id, {
        summary: 'Test summary',
        keyPoints: ['Point 1', 'Point 2'],
        titleSuggestion: 'Test Title',
      });

      const updated = await getNoteById(note.id);
      expect(updated?.summary).toBe('Test summary');
      expect(updated?.keyPoints).toEqual(['Point 1', 'Point 2']);
      expect(updated?.titleSuggestion).toBe('Test Title');
      expect(updated?.aiAssistStatus).toBe('done');
    });
  });

  describe('searchNotes', () => {
    it('should find notes matching transcript', async () => {
      await createNote({ audioUri: 'file://1.m4a', durationMs: 1000 });
      const note2 = await createNote({ audioUri: 'file://2.m4a', durationMs: 1000 });
      await updateNoteTranscript(note2.id, 'Hello world');

      const results = await searchNotes('world');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(note2.id);
    });

    it('should be case insensitive', async () => {
      const note = await createNote({ audioUri: 'file://1.m4a', durationMs: 1000 });
      await updateNoteTranscript(note.id, 'HELLO WORLD');

      const results = await searchNotes('hello');
      expect(results.length).toBe(1);
    });
  });
});
```

---

## 2. Tests de APIs

### 2.1 Transcription Service

**Archivo:** `__tests__/services/transcription.test.ts`

```tsx
import { transcribeNote } from '@/features/transcription/services/transcription';

// Mock fetch
global.fetch = jest.fn();

describe('Transcription Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GROQ_API_KEY = 'test-api-key';
  });

  describe('transcribeNote', () => {
    it('should call Groq API with correct parameters', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'Transcribed text' }),
      });

      await transcribeNote('note-123', 'file://audio.m4a');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('groq.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should update note with transcription on success', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'Hello world' }),
      });

      await transcribeNote('note-123', 'file://audio.m4a');

      // Verificar que se actualizó la nota
      const note = await getNoteById('note-123');
      expect(note?.transcript).toBe('Hello world');
      expect(note?.transcriptStatus).toBe('done');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(transcribeNote('note-123', 'file://audio.m4a'))
        .rejects.toThrow(/API key/);
    });

    it('should retry on transient failures', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: 'Success' }),
        });

      await transcribeNote('note-123', 'file://audio.m4a');

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle empty transcription', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: '' }),
      });

      await transcribeNote('note-123', 'file://audio.m4a');

      const note = await getNoteById('note-123');
      expect(note?.transcript).toBe('[No speech detected]');
    });
  });
});
```

### 2.2 AI Assist Service

**Archivo:** `__tests__/services/aiAssist.test.ts`

```tsx
import { generateAIAssist } from '@/features/ai-assist/services/aiAssist';

describe('AI Assist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_API_KEY = 'test-google-key';
  });

  describe('generateAIAssist', () => {
    it('should generate summary, key points, and title', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  summary: 'Test summary',
                  keyPoints: ['Point 1', 'Point 2'],
                  titleSuggestion: 'Test Title',
                }),
              }],
            },
          }],
        }),
      });

      const result = await generateAIAssist('This is a test transcript');

      expect(result.summary).toBe('Test summary');
      expect(result.keyPoints).toHaveLength(2);
      expect(result.titleSuggestion).toBe('Test Title');
    });

    it('should handle malformed JSON response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: '```json\n{"summary": "Test"}\n```',  // Con markdown
              }],
            },
          }],
        }),
      });

      const result = await generateAIAssist('Test');
      expect(result.summary).toBe('Test');
    });

    it('should throw on empty transcript', async () => {
      await expect(generateAIAssist(''))
        .rejects.toThrow(/transcript/i);
    });

    it('should throw on whitespace-only transcript', async () => {
      await expect(generateAIAssist('   \n\t  '))
        .rejects.toThrow(/transcript/i);
    });
  });
});
```

---

## 3. Tests de Hooks

### 3.1 useRecording

**Archivo:** `__tests__/hooks/useRecording.test.ts`

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useRecording } from '@/features/recording/hooks/useRecording';

// Mock expo-audio
jest.mock('expo-audio', () => ({
  useAudioRecorder: () => ({
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue({ uri: 'file://recording.m4a' }),
    getStatus: jest.fn().mockResolvedValue({ durationMillis: 5000 }),
  }),
  RecordingPresets: {
    HIGH_QUALITY: {},
  },
}));

describe('useRecording', () => {
  it('should start in idle state', () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.state).toBe('idle');
    expect(result.current.isRecording).toBe(false);
  });

  it('should transition to recording on start', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('recording');
    expect(result.current.isRecording).toBe(true);
  });

  it('should return recording info on stop', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    let recording;
    await act(async () => {
      recording = await result.current.stopRecording();
    });

    expect(recording).toEqual({
      uri: 'file://recording.m4a',
      durationMs: 5000,
    });
    expect(result.current.state).toBe('idle');
  });

  it('should reset state on cancel', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      await result.current.cancelRecording();
    });

    expect(result.current.state).toBe('idle');
  });
});
```

### 3.2 useAudioPlayer

**Archivo:** `__tests__/hooks/useAudioPlayer.test.ts`

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useAudioPlayer } from '@/features/audio-playback/hooks/useAudioPlayer';

describe('useAudioPlayer', () => {
  it('should load audio file', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.load('file://test.m4a');
    });

    expect(result.current.isLoaded).toBe(true);
  });

  it('should play and pause', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.load('file://test.m4a');
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    await act(async () => {
      await result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should update position during playback', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.load('file://test.m4a');
      await result.current.play();
    });

    await waitForNextUpdate();

    expect(result.current.position).toBeGreaterThan(0);
  });

  it('should seek to position', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.load('file://test.m4a');
      await result.current.seekTo(5000);
    });

    expect(result.current.position).toBe(5000);
  });

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.load('file://test.m4a');
    });

    unmount();

    // Verificar que se liberaron recursos
    expect(result.current.isLoaded).toBe(false);
  });
});
```

### 3.3 useNoteDetail

**Archivo:** `__tests__/hooks/useNoteDetail.test.ts`

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useNoteDetail } from '@/features/note-detail/hooks/useNoteDetail';

describe('useNoteDetail', () => {
  beforeEach(async () => {
    // Setup: crear nota de prueba
    await createNote({ id: 'test-note', audioUri: 'file://test.m4a', durationMs: 5000 });
  });

  it('should load note by id', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNoteDetail('test-note'));

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.note?.id).toBe('test-note');
  });

  it('should handle non-existent note', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNoteDetail('non-existent'));

    await waitForNextUpdate();

    expect(result.current.error).toBeTruthy();
    expect(result.current.note).toBeNull();
  });

  it('should update transcript', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNoteDetail('test-note'));

    await waitForNextUpdate();

    await act(async () => {
      await result.current.updateTranscript('New transcript');
    });

    expect(result.current.note?.transcript).toBe('New transcript');
  });

  it('should delete note', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNoteDetail('test-note'));

    await waitForNextUpdate();

    await act(async () => {
      await result.current.handleDelete();
    });

    const deleted = await getNoteById('test-note');
    expect(deleted).toBeNull();
  });
});
```

---

## 4. Tests de Componentes

### 4.1 NoteCard

**Archivo:** `__tests__/components/NoteCard.test.tsx`

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { NoteCard } from '@/components/ui/NoteCard';

const mockNote = {
  id: '1',
  audioUri: 'file://test.m4a',
  durationMs: 65000,
  createdAt: Date.now(),
  transcriptStatus: 'done' as const,
  transcript: 'This is a test transcript',
  aiAssistStatus: 'done' as const,
  titleSuggestion: 'Test Note',
};

describe('NoteCard', () => {
  it('should render note title', () => {
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={() => {}} />
    );

    expect(getByText('Test Note')).toBeTruthy();
  });

  it('should render formatted duration', () => {
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={() => {}} />
    );

    expect(getByText('1:05')).toBeTruthy();
  });

  it('should show transcript excerpt', () => {
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={() => {}} />
    );

    expect(getByText(/This is a test/)).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <NoteCard note={mockNote} onPress={onPress} />
    );

    fireEvent.press(getByRole('button'));

    expect(onPress).toHaveBeenCalled();
  });

  it('should show pending status chip', () => {
    const pendingNote = { ...mockNote, transcriptStatus: 'pending' as const };
    const { getByText } = render(
      <NoteCard note={pendingNote} onPress={() => {}} />
    );

    expect(getByText(/pending/i)).toBeTruthy();
  });
});
```

### 4.2 SearchBar

**Archivo:** `__tests__/components/SearchBar.test.tsx`

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchBar } from '@/features/search/components/SearchBar';

describe('SearchBar', () => {
  it('should render placeholder text', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={() => {}} />
    );

    expect(getByPlaceholderText(/buscar/i)).toBeTruthy();
  });

  it('should call onChangeText when typing', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={onChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText(/buscar/i), 'test query');

    expect(onChangeText).toHaveBeenCalledWith('test query');
  });

  it('should show clear button when has value', () => {
    const { getByLabelText } = render(
      <SearchBar value="test" onChangeText={() => {}} />
    );

    expect(getByLabelText(/limpiar/i)).toBeTruthy();
  });

  it('should hide clear button when empty', () => {
    const { queryByLabelText } = render(
      <SearchBar value="" onChangeText={() => {}} />
    );

    expect(queryByLabelText(/limpiar/i)).toBeNull();
  });

  it('should clear text when clear button pressed', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <SearchBar value="test" onChangeText={onChangeText} />
    );

    fireEvent.press(getByLabelText(/limpiar/i));

    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
```

---

## 5. Tests de Context

### 5.1 NotesContext

**Archivo:** `__tests__/contexts/NotesContext.test.tsx`

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { NotesProvider, useNotes } from '@/contexts/NotesContext';

const wrapper = ({ children }) => (
  <NotesProvider>{children}</NotesProvider>
);

describe('NotesContext', () => {
  it('should provide empty notes initially', () => {
    const { result } = renderHook(() => useNotes(), { wrapper });

    expect(result.current.notes).toEqual([]);
  });

  it('should load notes from database', async () => {
    // Pre-populate database
    await createNote({ audioUri: 'file://1.m4a', durationMs: 1000 });

    const { result, waitForNextUpdate } = renderHook(() => useNotes(), { wrapper });

    await waitForNextUpdate();

    expect(result.current.notes.length).toBe(1);
  });

  it('should add note to state', async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });

    const newNote = {
      id: 'new-1',
      audioUri: 'file://new.m4a',
      durationMs: 5000,
      createdAt: Date.now(),
      transcriptStatus: 'pending',
      aiAssistStatus: 'none',
    };

    act(() => {
      result.current.addNote(newNote);
    });

    expect(result.current.notes).toContainEqual(newNote);
  });

  it('should update note in state', async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });

    const note = {
      id: 'test-1',
      audioUri: 'file://test.m4a',
      durationMs: 5000,
      createdAt: Date.now(),
      transcriptStatus: 'pending' as const,
      aiAssistStatus: 'none' as const,
    };

    act(() => {
      result.current.addNote(note);
    });

    act(() => {
      result.current.updateNote('test-1', { transcriptStatus: 'done' });
    });

    const updated = result.current.notes.find(n => n.id === 'test-1');
    expect(updated?.transcriptStatus).toBe('done');
  });

  it('should remove note from state', async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });

    act(() => {
      result.current.addNote({
        id: 'to-remove',
        audioUri: 'file://test.m4a',
        durationMs: 1000,
        createdAt: Date.now(),
        transcriptStatus: 'pending',
        aiAssistStatus: 'none',
      });
    });

    act(() => {
      result.current.removeNote('to-remove');
    });

    expect(result.current.notes.find(n => n.id === 'to-remove')).toBeUndefined();
  });

  it('should refresh notes from database', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNotes(), { wrapper });

    // Add note directly to database
    await createNote({ id: 'db-note', audioUri: 'file://db.m4a', durationMs: 1000 });

    await act(async () => {
      await result.current.refreshNotes();
    });

    expect(result.current.notes.find(n => n.id === 'db-note')).toBeTruthy();
  });
});
```

---

## 6. Tests E2E

### 6.1 Flujo de Grabación Completo

**Archivo:** `__tests__/e2e/recordingFlow.test.ts`

```tsx
describe('Recording Flow E2E', () => {
  it('should complete full recording → transcription → AI assist flow', async () => {
    // 1. Simular grabación
    const recording = await simulateRecording(5000);
    expect(recording.uri).toBeTruthy();

    // 2. Crear nota
    const note = await createNote({
      audioUri: recording.uri,
      durationMs: recording.durationMs,
    });
    expect(note.id).toBeTruthy();
    expect(note.transcriptStatus).toBe('pending');

    // 3. Transcribir
    await transcribeNote(note.id, recording.uri);
    const afterTranscript = await getNoteById(note.id);
    expect(afterTranscript?.transcriptStatus).toBe('done');
    expect(afterTranscript?.transcript).toBeTruthy();

    // 4. Generar AI Assist
    await processAIAssist(note.id);
    const final = await getNoteById(note.id);
    expect(final?.aiAssistStatus).toBe('done');
    expect(final?.summary).toBeTruthy();
    expect(final?.keyPoints?.length).toBeGreaterThan(0);
    expect(final?.titleSuggestion).toBeTruthy();
  });
});
```

---

## Configuración de Testing

### jest.config.js

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
```

### jest.setup.js

```js
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
  }),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://documents/',
  cacheDirectory: 'file://cache/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Silence warnings during tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
```

---

## Priorización de Tests

| Área | Prioridad | Tests | Archivos |
|------|-----------|-------|----------|
| Database | Crítica | 15+ | `database.test.ts` |
| Transcription API | Crítica | 8+ | `transcription.test.ts` |
| AI Assist API | Crítica | 6+ | `aiAssist.test.ts` |
| useNoteDetail | Alta | 6+ | `useNoteDetail.test.ts` |
| useRecording | Alta | 5+ | `useRecording.test.ts` |
| useAudioPlayer | Alta | 6+ | `useAudioPlayer.test.ts` |
| NotesContext | Alta | 6+ | `NotesContext.test.ts` |
| NoteCard | Media | 5+ | `NoteCard.test.tsx` |
| SearchBar | Media | 5+ | `SearchBar.test.tsx` |
| E2E Flows | Media | 3+ | `recordingFlow.test.ts` |

**Meta de cobertura:** >70% en todas las métricas
