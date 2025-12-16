# Nuevas Funcionalidades

Este documento detalla todas las funcionalidades nuevas propuestas para VoiceNotesAI.

---

## 1. Export y Compartir

### 1.1 Copiar Transcripción

**Prioridad: Crítica**

**Implementación:**

**Archivo:** `src/features/note-detail/components/TranscriptSection.tsx`

```tsx
import * as Clipboard from 'expo-clipboard';

const handleCopyTranscript = async () => {
  if (note.transcript) {
    await Clipboard.setStringAsync(note.transcript);
    showToast('Transcripción copiada');
  }
};

// Agregar botón de copiar junto al de editar
<IconButton
  icon="content-copy"
  onPress={handleCopyTranscript}
  accessibilityLabel="Copiar transcripción"
/>
```

### 1.2 Compartir Nota

**Prioridad: Alta**

**Dependencia:** `expo-sharing`

**Nuevo archivo:** `src/features/export/services/shareNote.ts`

```tsx
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export async function shareNoteAsText(note: VoiceNote): Promise<void> {
  const content = formatNoteForExport(note);
  const fileUri = `${FileSystem.cacheDirectory}note-${note.id}.txt`;

  await FileSystem.writeAsStringAsync(fileUri, content);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: 'Compartir nota',
  });
}

function formatNoteForExport(note: VoiceNote): string {
  let content = '';

  if (note.titleSuggestion) {
    content += `# ${note.titleSuggestion}\n\n`;
  }

  content += `Fecha: ${new Date(note.createdAt).toLocaleString()}\n`;
  content += `Duración: ${formatDuration(note.durationMs)}\n\n`;

  if (note.transcript) {
    content += `## Transcripción\n\n${note.transcript}\n\n`;
  }

  if (note.summary) {
    content += `## Resumen\n\n${note.summary}\n\n`;
  }

  if (note.keyPoints?.length) {
    content += `## Puntos Clave\n\n`;
    note.keyPoints.forEach(point => {
      content += `- ${point}\n`;
    });
  }

  return content;
}
```

### 1.3 Export a PDF

**Prioridad: Baja**

**Dependencia:** `expo-print`

Similar a compartir, pero generando HTML y usando `Print.printToFileAsync()`.

---

## 2. Organización de Notas

### 2.1 Sorting (Ordenamiento)

**Prioridad: Alta**

**Archivo:** `app/index.tsx`

```tsx
type SortOption = 'date_desc' | 'date_asc' | 'duration_desc' | 'duration_asc';

const [sortBy, setSortBy] = useState<SortOption>('date_desc');

const sortedNotes = useMemo(() => {
  return [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'date_desc': return b.createdAt - a.createdAt;
      case 'date_asc': return a.createdAt - b.createdAt;
      case 'duration_desc': return b.durationMs - a.durationMs;
      case 'duration_asc': return a.durationMs - b.durationMs;
      default: return 0;
    }
  });
}, [notes, sortBy]);
```

**Nuevo componente:** `src/components/ui/SortSelector.tsx`

Dropdown o chips para seleccionar ordenamiento.

### 2.2 Filtering (Filtrado)

**Prioridad: Alta**

**Archivo:** `app/index.tsx`

```tsx
type FilterOption = 'all' | 'transcribed' | 'pending' | 'with_summary' | 'errors';

const [filter, setFilter] = useState<FilterOption>('all');

const filteredNotes = useMemo(() => {
  switch (filter) {
    case 'transcribed':
      return notes.filter(n => n.transcriptStatus === 'done');
    case 'pending':
      return notes.filter(n => n.transcriptStatus === 'pending' || n.aiAssistStatus === 'pending');
    case 'with_summary':
      return notes.filter(n => n.aiAssistStatus === 'done');
    case 'errors':
      return notes.filter(n => n.transcriptStatus === 'error' || n.aiAssistStatus === 'error');
    default:
      return notes;
  }
}, [notes, filter]);
```

**Nuevo componente:** `src/components/ui/FilterChips.tsx`

Chips horizontales scrolleables para filtros.

### 2.3 Sistema de Tags

**Prioridad: Media**

**Cambios en DB:** `src/services/database.ts`

```sql
CREATE TABLE IF NOT EXISTS note_tags (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(note_id) REFERENCES voice_notes(id) ON DELETE CASCADE,
  UNIQUE(note_id, tag_name)
);

CREATE INDEX idx_tag_name ON note_tags(tag_name);
```

**Nuevas funciones:**
- `addTagToNote(noteId: string, tagName: string)`
- `removeTagFromNote(noteId: string, tagName: string)`
- `getNotesByTag(tagName: string)`
- `getAllTags()`

**Nuevo componente:** `src/features/tags/components/TagSelector.tsx`

UI para agregar/quitar tags de una nota.

---

## 3. Títulos Editables

### 3.1 Campo de Título Manual

**Prioridad: Media**

**Cambios en DB:** Agregar columna `user_title`

```sql
ALTER TABLE voice_notes ADD COLUMN user_title TEXT;
```

**Archivo:** `src/features/note-detail/components/NoteDetailHeader.tsx`

```tsx
const [isEditingTitle, setIsEditingTitle] = useState(false);
const [title, setTitle] = useState(note.userTitle || note.titleSuggestion || '');

const handleSaveTitle = async () => {
  await updateNoteTitle(note.id, title);
  setIsEditingTitle(false);
};

// UI: Texto clickeable que se convierte en TextInput
{isEditingTitle ? (
  <TextInput
    value={title}
    onChangeText={setTitle}
    onBlur={handleSaveTitle}
    autoFocus
  />
) : (
  <Pressable onPress={() => setIsEditingTitle(true)}>
    <Text>{title || 'Sin título'}</Text>
  </Pressable>
)}
```

---

## 4. Soporte Offline

### 4.1 Cola de Transcripción

**Prioridad: Media**

**Cambios en DB:**

```sql
CREATE TABLE IF NOT EXISTS transcription_queue (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | processing | completed | failed
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(note_id) REFERENCES voice_notes(id) ON DELETE CASCADE
);
```

**Nuevo archivo:** `src/features/transcription/services/offlineQueue.ts`

```tsx
import NetInfo from '@react-native-community/netinfo';

export async function queueTranscription(noteId: string): Promise<void> {
  const isConnected = await NetInfo.fetch().then(state => state.isConnected);

  if (isConnected) {
    // Transcribir inmediatamente
    await transcribeNote(noteId);
  } else {
    // Agregar a cola
    await addToQueue(noteId);
  }
}

export function startQueueProcessor(): () => void {
  // Escuchar cambios de conexión
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      processQueue();
    }
  });

  return unsubscribe;
}

async function processQueue(): Promise<void> {
  const pending = await getPendingFromQueue();

  for (const item of pending) {
    try {
      await updateQueueStatus(item.id, 'processing');
      await transcribeNote(item.noteId);
      await updateQueueStatus(item.id, 'completed');
    } catch (error) {
      await updateQueueStatus(item.id, 'failed', error.message);
    }
  }
}
```

### 4.2 Indicador de Estado Offline

**Prioridad: Media**

**Nuevo componente:** `src/components/ui/OfflineIndicator.tsx`

Banner fijo arriba cuando no hay conexión:
- "Sin conexión. Las grabaciones se procesarán cuando vuelvas a conectarte."

---

## 5. Backup y Restore

### 5.1 Export de Base de Datos

**Prioridad: Baja**

**Nuevo archivo:** `src/features/backup/services/backup.ts`

```tsx
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportBackup(): Promise<void> {
  const notes = await getAllNotes();
  const backup = {
    version: 1,
    exportedAt: Date.now(),
    notes: notes,
  };

  const json = JSON.stringify(backup, null, 2);
  const fileUri = `${FileSystem.documentDirectory}voicenotesai-backup-${Date.now()}.json`;

  await FileSystem.writeAsStringAsync(fileUri, json);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup',
  });
}
```

### 5.2 Import de Backup

**Prioridad: Baja**

```tsx
import * as DocumentPicker from 'expo-document-picker';

export async function importBackup(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
  });

  if (result.canceled) return 0;

  const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const backup = JSON.parse(content);

  // Validar estructura
  if (!backup.version || !backup.notes) {
    throw new Error('Archivo de backup inválido');
  }

  // Importar notas (sin duplicar)
  let imported = 0;
  for (const note of backup.notes) {
    const exists = await getNoteById(note.id);
    if (!exists) {
      await insertNote(note);
      imported++;
    }
  }

  return imported;
}
```

---

## 6. Configuración de Audio

### 6.1 Calidad de Grabación

**Prioridad: Baja**

**Nuevo archivo:** `src/features/settings/screens/SettingsScreen.tsx`

```tsx
type AudioQuality = 'low' | 'medium' | 'high';

// Mapeo a RecordingPresets
const qualityPresets = {
  low: { bitrate: 32000, sampleRate: 22050 },
  medium: { bitrate: 64000, sampleRate: 44100 },
  high: { bitrate: 128000, sampleRate: 44100 },  // actual
};
```

**Storage:** AsyncStorage para preferencias

### 6.2 Selección de Idioma de Transcripción

**Prioridad: Media**

**Archivo:** `src/features/transcription/services/transcription.ts`

Groq Whisper soporta múltiples idiomas. Agregar parámetro `language`:

```tsx
formData.append('language', userPreferredLanguage || 'es');
```

**UI:** Selector de idioma en configuración.

---

## 7. Mejoras de Búsqueda

### 7.1 Búsqueda Avanzada

**Prioridad: Baja**

**Archivo:** `src/features/search/hooks/useSearch.ts`

```tsx
interface SearchOptions {
  query: string;
  searchIn: ('title' | 'transcript' | 'summary')[];
  dateRange?: { from: number; to: number };
  status?: TranscriptStatus[];
}

export function useAdvancedSearch() {
  const search = useCallback(async (options: SearchOptions) => {
    let sql = 'SELECT * FROM voice_notes WHERE 1=1';
    const params: unknown[] = [];

    if (options.query) {
      const fields = options.searchIn.map(f => {
        switch (f) {
          case 'title': return '(user_title LIKE ? OR title_suggestion LIKE ?)';
          case 'transcript': return 'transcript LIKE ?';
          case 'summary': return 'summary LIKE ?';
        }
      });
      sql += ` AND (${fields.join(' OR ')})`;
      // ... agregar params
    }

    if (options.dateRange) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(options.dateRange.from, options.dateRange.to);
    }

    // ... ejecutar query
  }, []);

  return { search };
}
```

---

## 8. Schema de Base de Datos Mejorado

### Schema Propuesto Completo

```sql
-- Tabla principal expandida
CREATE TABLE voice_notes (
  id TEXT PRIMARY KEY,

  -- Audio
  audio_uri TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  audio_format TEXT DEFAULT 'm4a',

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,  -- Soft delete

  -- Metadata de usuario
  user_title TEXT,
  user_description TEXT,

  -- Transcripción
  transcript TEXT,
  transcript_status TEXT DEFAULT 'pending',
  transcript_language TEXT DEFAULT 'es',

  -- AI Assist
  summary TEXT,
  key_points TEXT,  -- JSON array
  title_suggestion TEXT,
  ai_assist_status TEXT DEFAULT 'none',

  -- Sync
  sync_status TEXT DEFAULT 'synced',

  -- Schema version
  schema_version INTEGER DEFAULT 1
);

-- Tags
CREATE TABLE note_tags (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(note_id) REFERENCES voice_notes(id) ON DELETE CASCADE,
  UNIQUE(note_id, tag_name)
);

-- Cola offline
CREATE TABLE transcription_queue (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(note_id) REFERENCES voice_notes(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_created_at ON voice_notes(created_at DESC);
CREATE INDEX idx_updated_at ON voice_notes(updated_at DESC);
CREATE INDEX idx_sync_status ON voice_notes(sync_status);
CREATE INDEX idx_tag_name ON note_tags(tag_name);
CREATE INDEX idx_queue_status ON transcription_queue(status);
```

---

## Resumen de Dependencias Nuevas

| Feature | Dependencia | Comando |
|---------|-------------|---------|
| Copiar | `expo-clipboard` | `bunx expo install expo-clipboard` |
| Compartir | `expo-sharing` | `bunx expo install expo-sharing` |
| PDF Export | `expo-print` | `bunx expo install expo-print` |
| Offline | `@react-native-community/netinfo` | `bunx expo install @react-native-community/netinfo` |
| File Picker | `expo-document-picker` | `bunx expo install expo-document-picker` |

## Priorización

| Feature | Prioridad | Esfuerzo | Impacto |
|---------|-----------|----------|---------|
| Copiar transcripción | Crítica | Bajo | Alto |
| Compartir nota | Alta | Medio | Alto |
| Sorting | Alta | Bajo | Alto |
| Filtering | Alta | Bajo | Alto |
| Títulos editables | Media | Bajo | Medio |
| Tags | Media | Medio | Medio |
| Idioma transcripción | Media | Bajo | Medio |
| Cola offline | Media | Alto | Alto |
| Backup/Restore | Baja | Medio | Medio |
| Export PDF | Baja | Medio | Bajo |
| Búsqueda avanzada | Baja | Medio | Bajo |
