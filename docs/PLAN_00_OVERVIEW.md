# VoiceNotes AI - Implementation Plan Overview

## Project Summary

Cross-platform mobile app for voice notes with:
- Audio recording with live feedback
- ASR transcription (speech-to-text)
- LLM-powered summaries ("AI Assist")
- Local persistence and search

## Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Framework | Expo SDK 54 + prebuild | Native modules required, Expo ecosystem benefits |
| Routing | expo-router v6 | Already configured, file-based routing |
| Native Modules | Expo Modules API | Modern Swift/Kotlin, cleaner than old bridge |
| Audio | expo-av | Recording/playback, well-maintained |
| ASR | Google Speech-to-Text V2 (Chirp) | Latest Google ASR, excellent accuracy |
| LLM | Google Gemini 2.5 Flash | Latest fast model, ideal for summarization |
| Persistence | expo-sqlite | SQL queries for search feature |
| State | React Context + hooks | Simple, sufficient for MVP |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        React Native                          │
├─────────────────────────────────────────────────────────────┤
│  Screens          │  Hooks              │  Services          │
│  - NotesList      │  - useNotes         │  - transcription   │
│  - NoteDetail     │  - useRecording     │  - aiAssist        │
│  - Recording UI   │  - useAudioPlayer   │  - storage         │
├─────────────────────────────────────────────────────────────┤
│                     Native Modules                           │
│  - NativeAudioSession (Swift/Kotlin)                        │
│  - NativeLevelMeter (Swift/Kotlin)                          │
├─────────────────────────────────────────────────────────────┤
│  expo-av          │  expo-sqlite        │  External APIs     │
│  (recording)      │  (persistence)      │  (Whisper, GPT)    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

| Phase | Document | Estimated Effort |
|-------|----------|------------------|
| 1 | [Project Setup](./PLAN_01_PROJECT_SETUP.md) | 1 hour |
| 2 | [Native Modules](./PLAN_02_NATIVE_MODULES.md) | 3-4 hours |
| 3 | [Data Layer](./PLAN_03_DATA_LAYER.md) | 1 hour |
| 4 | [Recording Feature](./PLAN_04_RECORDING.md) | 1-2 hours |
| 5 | [Transcription](./PLAN_05_TRANSCRIPTION.md) | 1-2 hours |
| 6 | [UI Screens](./PLAN_06_UI_SCREENS.md) | 2-3 hours |
| 7 | [AI Assist](./PLAN_07_AI_ASSIST.md) | 1 hour |
| 8 | [Testing](./PLAN_08_TESTING.md) | 1 hour |
| 9 | [Delivery](./PLAN_09_DELIVERY.md) | 1 hour |

**Total: ~12-16 hours**

## File Structure (Target)

```
VoiceNotesAI/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx                 # Notes list (main screen)
│   └── note/
│       └── [id].tsx              # Note detail screen
├── components/
│   ├── RecordButton.tsx
│   ├── RecordingOverlay.tsx
│   ├── NoteCard.tsx
│   ├── AudioPlayer.tsx
│   ├── LevelMeter.tsx
│   ├── SearchBar.tsx
│   └── TranscriptEditor.tsx
├── hooks/
│   ├── useNotes.ts
│   ├── useRecording.ts
│   ├── useAudioPlayer.ts
│   └── useSearch.ts
├── services/
│   ├── database.ts
│   ├── transcription.ts
│   └── aiAssist.ts
├── modules/
│   ├── native-audio-session/     # Expo Module
│   │   ├── index.ts
│   │   ├── src/
│   │   │   └── NativeAudioSessionModule.ts
│   │   ├── ios/
│   │   │   └── NativeAudioSessionModule.swift
│   │   └── android/
│   │       └── NativeAudioSessionModule.kt
│   └── native-level-meter/       # Expo Module
│       ├── index.ts
│       ├── src/
│       │   └── NativeLevelMeterModule.ts
│       ├── ios/
│       │   └── NativeLevelMeterModule.swift
│       └── android/
│           └── NativeLevelMeterModule.kt
├── types/
│   └── index.ts
├── constants/
│   └── Colors.ts
└── docs/
    └── *.md
```

## Data Model

```typescript
interface VoiceNote {
  id: string;
  audioUri: string;
  durationMs: number;
  createdAt: number;           // timestamp
  transcript: string | null;
  transcriptStatus: 'pending' | 'done' | 'error';
  summary: string | null;
  keyPoints: string[] | null;
  titleSuggestion: string | null;
  aiAssistStatus: 'none' | 'pending' | 'done' | 'error';
}
```

## API Keys Required

```env
EXPO_PUBLIC_GOOGLE_API_KEY=AIza...
```

Note: Single Google API key works for both Speech-to-Text and Gemini APIs.

## Security Note

For MVP, API calls go directly from client. Production would need:
- Backend proxy to hide API keys
- Rate limiting
- User authentication

This tradeoff is acceptable for a take-home assignment but should be documented.
