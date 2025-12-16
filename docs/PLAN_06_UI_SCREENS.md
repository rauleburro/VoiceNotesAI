# Phase 6: UI Screens

## Objective
Build the main screens: Notes List and Note Detail with all required UX features.

---

## Screen Structure

```
app/
├── _layout.tsx        # Root layout with NotesProvider
├── index.tsx          # Notes list (main screen)
└── note/
    └── [id].tsx       # Note detail screen
```

---

## Root Layout

**File: `app/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/components/useColorScheme';
import { NotesProvider } from '@/contexts/NotesContext';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NotesProvider>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: 'Voice Notes',
              headerLargeTitle: true,
            }}
          />
          <Stack.Screen
            name="note/[id]"
            options={{
              title: 'Note',
              presentation: 'card',
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </NotesProvider>
    </ThemeProvider>
  );
}
```

---

## Notes List Screen

**File: `app/index.tsx`**

```typescript
import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { v4 as uuid } from 'uuid';
import { useNotesContext } from '@/contexts/NotesContext';
import { useRecording } from '@/hooks/useRecording';
import { useTranscription } from '@/hooks/useTranscription';
import { useSearch } from '@/hooks/useSearch';
import { NoteCard } from '@/components/NoteCard';
import { SearchBar } from '@/components/SearchBar';
import { RecordButton } from '@/components/RecordButton';
import { RecordingOverlay } from '@/components/RecordingOverlay';
import { EmptyState } from '@/components/EmptyState';

export default function NotesListScreen() {
  const router = useRouter();
  const { notes, loading, loadNotes, addNote, updateNote } = useNotesContext();
  const { state, durationMs, level, startRecording, stopRecording, cancelRecording } = useRecording();
  const { transcribe } = useTranscription();
  const { query, setQuery, clearSearch, displayedNotes, isFiltered } = useSearch(notes);

  const handleRecordPress = useCallback(async () => {
    if (state === 'idle') {
      await startRecording();
    }
  }, [state, startRecording]);

  const handleStop = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      const noteId = uuid();
      const note = await addNote({
        id: noteId,
        audioUri: result.uri,
        durationMs: result.durationMs,
        createdAt: Date.now(),
      });

      // Start transcription in background
      transcribe(noteId, result.uri).then((transcript) => {
        if (transcript) {
          updateNote(noteId, { transcript, transcriptStatus: 'done' });
        } else {
          updateNote(noteId, { transcriptStatus: 'error' });
        }
      });
    }
  }, [stopRecording, addNote, transcribe, updateNote]);

  const handleNotePress = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }) => (
    <NoteCard
      note={item}
      onPress={() => handleNotePress(item.id)}
    />
  ), [handleNotePress]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (isFiltered) {
      return (
        <EmptyState
          icon="search"
          title="No results found"
          message={`No notes match "${query}"`}
          action={{ label: 'Clear search', onPress: clearSearch }}
        />
      );
    }

    return (
      <EmptyState
        icon="microphone"
        title="No voice notes yet"
        message="Tap the microphone button to record your first note"
      />
    );
  }, [loading, isFiltered, query, clearSearch]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onClear={clearSearch}
      />

      {/* Notes list */}
      <FlatList
        data={displayedNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={displayedNotes.length === 0 && styles.emptyList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotes} />
        }
      />

      {/* Record button */}
      <View style={styles.recordContainer}>
        <RecordButton
          isRecording={state === 'recording'}
          onPress={handleRecordPress}
          disabled={state === 'stopping'}
        />
      </View>

      {/* Recording overlay */}
      {state === 'recording' && (
        <RecordingOverlay
          durationMs={durationMs}
          level={level}
          onStop={handleStop}
          onCancel={cancelRecording}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyList: {
    flex: 1,
  },
  recordContainer: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
  },
});
```

---

## Note Card Component

**File: `components/NoteCard.tsx`**

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { VoiceNote } from '@/types';
import { StatusChip } from './StatusChip';

interface NoteCardProps {
  note: VoiceNote;
  onPress: () => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getExcerpt(text: string | null, maxLength: number = 80): string {
  if (!text) return 'No transcript yet...';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function NoteCard({ note, onPress }: NoteCardProps) {
  const title = note.titleSuggestion || formatDate(note.createdAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <StatusChip status={note.transcriptStatus} />
      </View>

      <Text style={styles.excerpt} numberOfLines={2}>
        {getExcerpt(note.transcript)}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>
          {formatDate(note.createdAt)}
        </Text>
        <Text style={styles.meta}>
          {formatDuration(note.durationMs)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  excerpt: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    fontSize: 13,
    color: '#999',
  },
});
```

---

## Note Detail Screen

**File: `app/note/[id].tsx`**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useNotesContext } from '@/contexts/NotesContext';
import { getNoteById, updateNoteTranscript, deleteNote } from '@/services/database';
import { deleteRecordingFile } from '@/services/recording';
import { useTranscription } from '@/hooks/useTranscription';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAIAssist } from '@/hooks/useAIAssist';
import { AudioPlayer } from '@/components/AudioPlayer';
import { StatusChip } from '@/components/StatusChip';
import { RetryButton } from '@/components/RetryButton';
import { AIAssistSection } from '@/components/AIAssistSection';
import { AudioRouteToggle } from '@/components/AudioRouteToggle';
import { VoiceNote } from '@/types';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { updateNote, removeNote, refreshNote } = useNotesContext();

  const [note, setNote] = useState<VoiceNote | null>(null);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { transcribe, isTranscribing } = useTranscription();
  const { runAIAssist, isProcessing: isAIProcessing } = useAIAssist();
  const player = useAudioPlayer();

  // Load note
  useEffect(() => {
    if (id) {
      getNoteById(id).then((n) => {
        setNote(n);
        setEditedTranscript(n?.transcript || '');
      });
    }
  }, [id]);

  // Update header
  useEffect(() => {
    if (note?.titleSuggestion) {
      // Dynamic title would be set here if needed
    }
  }, [note?.titleSuggestion]);

  const handleRetryTranscription = useCallback(async () => {
    if (!note) return;

    const transcript = await transcribe(note.id, note.audioUri);
    if (transcript) {
      setNote(prev => prev ? { ...prev, transcript, transcriptStatus: 'done' } : null);
      setEditedTranscript(transcript);
      updateNote(note.id, { transcript, transcriptStatus: 'done' });
    }
  }, [note, transcribe, updateNote]);

  const handleSaveTranscript = useCallback(async () => {
    if (!note || editedTranscript === note.transcript) {
      setIsEditing(false);
      return;
    }

    await updateNoteTranscript(note.id, editedTranscript);
    setNote(prev => prev ? { ...prev, transcript: editedTranscript } : null);
    updateNote(note.id, { transcript: editedTranscript });
    setIsEditing(false);
  }, [note, editedTranscript, updateNote]);

  const handleAIAssist = useCallback(async () => {
    if (!note?.transcript) return;

    const result = await runAIAssist(note.id, note.transcript);
    if (result) {
      setNote(prev => prev ? {
        ...prev,
        summary: result.summary,
        keyPoints: result.keyPoints,
        titleSuggestion: result.titleSuggestion,
        aiAssistStatus: 'done',
      } : null);
      refreshNote(note.id);
    }
  }, [note, runAIAssist, refreshNote]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this voice note? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (note) {
              await deleteRecordingFile(note.audioUri);
              await deleteNote(note.id);
              removeNote(note.id);
              router.back();
            }
          },
        },
      ]
    );
  }, [note, removeNote, router]);

  if (!note) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: note.titleSuggestion || 'Note',
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <FontAwesome name="trash" size={20} color="#FF3B30" />
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Audio Player */}
        <View style={styles.section}>
          <AudioPlayer
            uri={note.audioUri}
            durationMs={note.durationMs}
            player={player}
          />
          <AudioRouteToggle />
        </View>

        {/* Transcript */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <View style={styles.sectionActions}>
              <StatusChip status={note.transcriptStatus} />
              {note.transcriptStatus === 'error' && (
                <RetryButton onRetry={handleRetryTranscription} isLoading={isTranscribing} />
              )}
              {note.transcriptStatus === 'done' && !isEditing && (
                <Pressable onPress={() => setIsEditing(true)}>
                  <FontAwesome name="edit" size={18} color="#007AFF" />
                </Pressable>
              )}
            </View>
          </View>

          {isEditing ? (
            <View>
              <TextInput
                style={styles.transcriptInput}
                value={editedTranscript}
                onChangeText={setEditedTranscript}
                multiline
                autoFocus
              />
              <View style={styles.editActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => {
                    setEditedTranscript(note.transcript || '');
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSaveTranscript}>
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.transcript}>
              {note.transcript || 'Transcript not available'}
            </Text>
          )}
        </View>

        {/* AI Assist */}
        {note.transcriptStatus === 'done' && (
          <AIAssistSection
            note={note}
            onRunAIAssist={handleAIAssist}
            isProcessing={isAIProcessing}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    color: '#333',
  },
  transcriptInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
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
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Supporting Components

### Search Bar

**File: `components/SearchBar.tsx`**

```typescript
import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChangeText, onClear }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <FontAwesome name="search" size={16} color="#999" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search transcripts..."
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8}>
          <FontAwesome name="times-circle" size={18} color="#999" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
});
```

### Empty State

**File: `components/EmptyState.tsx`**

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <FontAwesome name={icon as any} size={48} color="#CCC" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action && (
        <Pressable style={styles.button} onPress={action.onPress}>
          <Text style={styles.buttonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Verification Checklist

- [ ] Notes list displays all notes sorted by date
- [ ] Each note card shows: timestamp, duration, excerpt, status
- [ ] Search filters notes by transcript content
- [ ] Search debounces at 300ms
- [ ] Empty state shows when no notes
- [ ] "No results" shows when search has no matches
- [ ] Tapping note opens detail screen
- [ ] Detail shows audio player with play/pause
- [ ] Speaker/earpiece toggle works
- [ ] Full transcript is displayed
- [ ] Transcript is editable with save/cancel
- [ ] Delete action shows confirmation
- [ ] Delete removes note and audio file
- [ ] Navigation works correctly (back, etc.)

---

## Next Phase
[Phase 7: AI Assist](./PLAN_07_AI_ASSIST.md)
