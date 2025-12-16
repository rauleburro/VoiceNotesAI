# Mejoras de Calidad de Código

Este documento detalla todas las mejoras técnicas y de arquitectura identificadas para VoiceNotesAI.

---

## 1. Memory Leaks

### 1.1 Promise sin Cleanup en useNoteDetail

**Prioridad: Crítica**

**Archivo:** `src/features/note-detail/hooks/useNoteDetail.ts` (líneas 26-50)

**Problema:** Si el componente se desmonta mientras `getNoteById()` está pendiente, intentará actualizar estado en componente desmontado.

**Solución:**

```tsx
useEffect(() => {
  if (!noteId) {
    setIsLoading(false);
    setError('Note ID not provided');
    return;
  }

  let isMounted = true;  // Flag de montaje

  setIsLoading(true);
  setError(null);

  getNoteById(noteId)
    .then((loadedNote) => {
      if (!isMounted) return;  // Verificar antes de actualizar
      setNote(loadedNote);
      // ...resto del código
    })
    .catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e.message : 'Error loading note');
    })
    .finally(() => {
      if (!isMounted) return;
      setIsLoading(false);
    });

  return () => {
    isMounted = false;  // Cleanup
  };
}, [noteId]);
```

---

## 2. Race Conditions

### 2.1 Race Condition en updateAIAssist

**Prioridad: Alta**

**Archivo:** `src/features/note-detail/hooks/useNoteDetail.ts` (líneas 105-117)

**Problema:**
1. Actualiza estado local optimísticamente
2. Llama `refreshNote()` inmediatamente
3. Si la DB no se ha actualizado, sobrescribe con datos viejos

**Solución:**

```tsx
const updateAIAssist = useCallback(async (result: AIAssistResult) => {
  if (!note) return;

  // Esperar a que la base de datos se actualice primero
  await updateNoteAIAssist(note.id, result);

  // Luego actualizar estado local
  setNote(prev => prev ? {
    ...prev,
    summary: result.summary,
    keyPoints: result.keyPoints,
    titleSuggestion: result.titleSuggestion,
    aiAssistStatus: 'done',
  } : null);

  // Actualizar contexto también
  updateNote(note.id, {
    summary: result.summary,
    keyPoints: result.keyPoints,
    titleSuggestion: result.titleSuggestion,
    aiAssistStatus: 'done',
  });

  // Ya no necesitamos refreshNote() porque tenemos los datos correctos
}, [note, updateNote]);
```

---

## 3. Timeouts en APIs

### 3.1 Sin Timeout en Transcription

**Prioridad: Crítica**

**Archivo:** `src/features/transcription/services/transcription.ts` (líneas 45-52)

**Problema:** Las llamadas fetch pueden colgar indefinidamente.

**Solución:**

```tsx
const TIMEOUT_MS = 60000; // 60 segundos

async function transcribeWithGroq(audioUri: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const formData = new FormData();
    // ... preparar formData

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,  // Agregar signal
    });

    // ... resto del código
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La transcripción tardó demasiado. Intenta con un audio más corto.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 3.2 Sin Timeout en AI Assist

**Prioridad: Crítica**

**Archivo:** `src/features/ai-assist/services/aiAssist.ts` (líneas 75-90)

Aplicar el mismo patrón de AbortController.

---

## 4. Manejo de Errores

### 4.1 Códigos de Estado HTTP Específicos

**Prioridad: Media**

**Archivo:** `src/features/ai-assist/services/aiAssist.ts` (líneas 85-90)

**Problema:** No distingue entre tipos de errores.

**Solución:**

```tsx
if (!response.ok) {
  if (response.status === 401) {
    throw new Error('API key inválida. Verifica tu configuración en .env');
  }
  if (response.status === 429) {
    throw new Error('Límite de solicitudes alcanzado. Espera unos minutos.');
  }
  if (response.status >= 500) {
    throw new Error('El servidor no está disponible. Intenta más tarde.');
  }

  const errorData = await response.json().catch(() => ({}));
  throw new Error(
    errorData.error?.message || `Error del servidor: ${response.status}`
  );
}
```

### 4.2 Mensajes de Error con Contexto

**Prioridad: Media**

**Archivo:** `src/features/transcription/services/transcription.ts` (líneas 74-78)

```tsx
catch (error) {
  console.error('Transcription error:', error);
  await updateTranscriptStatus(noteId, 'error');

  // Envolver error con contexto útil
  const userMessage = error instanceof Error
    ? error.message.includes('401')
      ? 'API key de Groq inválida. Verifica EXPO_PUBLIC_GROQ_API_KEY en .env'
      : error.message.includes('413')
      ? 'El archivo de audio es demasiado grande. Graba un audio más corto.'
      : error.message
    : 'Error desconocido en transcripción';

  throw new Error(userMessage);
}
```

---

## 5. Memoización

### 5.1 Callbacks en NotesList

**Prioridad: Media**

**Archivo:** `src/features/notes-list/components/NotesList.tsx` (líneas 11-32)

**Problema:** Callbacks recreados en cada render causan re-renders innecesarios.

**Solución:**

```tsx
import React, { useCallback, memo } from 'react';

export const NotesList = memo(function NotesList({ notes }: NotesListProps) {
  const router = useRouter();

  const handleNotePress = useCallback((noteId: string) => {
    router.push(`/note/${noteId}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: VoiceNote }) => (
    <NoteCard
      note={item}
      onPress={() => handleNotePress(item.id)}
    />
  ), [handleNotePress]);

  const keyExtractor = useCallback((item: VoiceNote) => item.id, []);

  return (
    <FlatList
      data={notes}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      // ...resto de props
    />
  );
});
```

### 5.2 Callback Dependencies en useRecording

**Prioridad: Media**

**Archivo:** `src/features/recording/hooks/useRecording.ts` (líneas 38-76)

**Problema:** `recorder` en dependencies puede no ser referencia estable.

**Solución:** Usar `useRef` para el recorder en lugar de estado.

---

## 6. Validación de Datos

### 6.1 Runtime Validation en Database

**Prioridad: Media**

**Archivo:** `src/services/database.ts` (líneas 36-49)

**Problema:** Type assertions sin validación pueden crear objetos inválidos.

**Solución:**

```tsx
function rowToVoiceNote(row: unknown): VoiceNote {
  if (typeof row !== 'object' || row === null) {
    throw new Error('Invalid database row: not an object');
  }

  const r = row as Record<string, unknown>;

  // Validar campos requeridos
  if (typeof r.id !== 'string') throw new Error('Missing or invalid id');
  if (typeof r.audio_uri !== 'string') throw new Error('Missing or invalid audio_uri');
  if (typeof r.duration_ms !== 'number') throw new Error('Missing or invalid duration_ms');
  if (typeof r.created_at !== 'number') throw new Error('Missing or invalid created_at');

  return {
    id: r.id,
    audioUri: r.audio_uri,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
    transcript: typeof r.transcript === 'string' ? r.transcript : undefined,
    transcriptStatus: validateStatus(r.transcript_status, ['pending', 'done', 'error']),
    summary: typeof r.summary === 'string' ? r.summary : undefined,
    keyPoints: parseJsonArray(r.key_points),
    titleSuggestion: typeof r.title_suggestion === 'string' ? r.title_suggestion : undefined,
    aiAssistStatus: validateStatus(r.ai_assist_status, ['none', 'pending', 'done', 'error']),
  };
}

function validateStatus<T extends string>(value: unknown, valid: T[]): T {
  if (typeof value === 'string' && valid.includes(value as T)) {
    return value as T;
  }
  return valid[0]; // Default al primer valor válido
}

function parseJsonArray(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
```

---

## 7. Estado y Sincronización

### 7.1 updateNote No Persiste

**Prioridad: Alta**

**Archivo:** `src/contexts/NotesContext.tsx` (líneas 49-53)

**Problema:** `updateNote` solo actualiza memoria, no persiste a DB.

**Opciones:**

**Opción A: Hacer updateNote async y persistir**
```tsx
const updateNote = useCallback(async (id: string, updates: Partial<VoiceNote>) => {
  // Actualizar en DB primero
  await updateNoteInDatabase(id, updates);

  // Luego actualizar estado
  setNotes(prev => prev.map(note =>
    note.id === id ? { ...note, ...updates } : note
  ));
}, []);
```

**Opción B: Documentar claramente que es optimistic-only**
```tsx
/**
 * Updates note in memory only (optimistic update).
 * Caller is responsible for persisting to database separately.
 */
const updateNoteOptimistic = useCallback(/* ... */);
```

### 7.2 Fuente Única de Verdad

**Prioridad: Media**

**Archivo:** `src/features/note-detail/hooks/useNoteDetail.ts` (líneas 92-103)

**Problema:** Dos fuentes de verdad (estado local + contexto).

**Solución:** Confiar solo en contexto después de actualizar DB:

```tsx
const updateTranscript = useCallback(async (transcript: string) => {
  if (!note || transcript === note.transcript) return;

  try {
    await updateNoteTranscript(note.id, transcript);
    // Solo actualizar contexto, el estado local se sincronizará
    updateNote(note.id, { transcript });
    // Refrescar para obtener datos de DB
    await refreshNote(note.id);
  } catch (e) {
    console.error('Error updating transcript:', e);
    throw e;
  }
}, [note, updateNote, refreshNote]);
```

---

## 8. Schema de Base de Datos

### 8.1 Sistema de Migraciones

**Prioridad: Media**

**Archivo:** `src/services/database.ts` (líneas 17-33)

**Problema:** Sin versionado de schema.

**Solución:**

```tsx
const SCHEMA_VERSION = 1;

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Verificar versión actual
  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;'
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await migrateDatabase(database, currentVersion, SCHEMA_VERSION);
  }
}

async function migrateDatabase(
  db: SQLite.SQLiteDatabase,
  from: number,
  to: number
): Promise<void> {
  // Migración 0 -> 1: Schema inicial
  if (from < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS voice_notes (
        -- schema actual
      );
      CREATE INDEX IF NOT EXISTS idx_created_at ON voice_notes(created_at DESC);
    `);
  }

  // Futuras migraciones:
  // if (from < 2) { ... }

  await db.execAsync(`PRAGMA user_version = ${to};`);
}
```

---

## Resumen de Archivos a Modificar

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `src/features/note-detail/hooks/useNoteDetail.ts` | 26-50, 105-117 | Memory leak fix, race condition |
| `src/features/transcription/services/transcription.ts` | 45-78 | Timeout, error messages |
| `src/features/ai-assist/services/aiAssist.ts` | 75-134 | Timeout, HTTP status handling |
| `src/features/notes-list/components/NotesList.tsx` | 11-32 | Memoización |
| `src/features/recording/hooks/useRecording.ts` | 38-76 | Stable callback refs |
| `src/services/database.ts` | 17-49 | Migraciones, validación |
| `src/contexts/NotesContext.tsx` | 49-53 | Documentar o persistir updateNote |

## Patrones a Aplicar Consistentemente

1. **AbortController** para todas las llamadas fetch
2. **isMounted flag** para todos los useEffect con promises
3. **useCallback con deps correctas** para handlers
4. **Validación runtime** en boundaries (DB, API responses)
5. **Error messages descriptivos** para usuarios
