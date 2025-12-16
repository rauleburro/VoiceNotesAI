# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server
bun start

# Run on platforms
bun run ios        # iOS simulator (requires prebuild)
bun run android    # Android emulator (requires prebuild)

# Generate native projects (required before first run)
bunx expo prebuild
bunx expo prebuild --clean  # Full clean rebuild

# Testing
bun test                    # Run all tests
bun test -- --watch        # Watch mode
bun test -- --coverage     # With coverage
bun test -- __tests__/hooks/useSearch.test.ts  # Single file
```

## Architecture

**Expo SDK 54** React Native app with **expo-router v6** file-based routing. Uses React Native New Architecture.

### Data Flow

```
Recording → Transcription (Groq Whisper) → AI Assist (Google Gemini)
    ↓              ↓                                ↓
 SQLite ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

### Key Layers

- **Screens** (`app/`): `index.tsx` (notes list), `note/[id].tsx` (detail view)
- **Context** (`contexts/NotesContext.tsx`): Global state for notes list, syncs with SQLite
- **Hooks** (`hooks/`): Business logic encapsulation
  - `useRecording` - Audio recording via expo-audio
  - `useTranscription` - Groq Whisper API calls
  - `useAIAssist` - Google Gemini summarization
  - `useAudioPlayer` - Audio playback control via expo-audio
  - `useSearch` - Debounced search filtering
- **Services** (`services/`): API integrations and database
  - `database.ts` - SQLite CRUD operations
  - `transcription.ts` - Groq Whisper (free speech-to-text)
  - `aiAssist.ts` - Google Gemini 2.5 Flash
  - `recording.ts` - Audio recording helpers

### Custom Native Modules (`modules/`)

Two Expo modules with Swift (iOS) and Kotlin (Android) implementations:

- **native-audio-session**: Speaker/earpiece audio routing control
- **native-level-meter**: Real-time microphone level streaming (~15Hz)

After modifying native modules, run `bunx expo prebuild --clean`.

### Database Schema

Single `voice_notes` table in SQLite:
- `id`, `audio_uri`, `duration_ms`, `created_at`
- `transcript`, `transcript_status` (pending|done|error)
- `summary`, `key_points` (JSON), `title_suggestion`, `ai_assist_status` (none|pending|done|error)

### Path Aliases

`@/*` maps to project root (e.g., `@/services/database`).

## Environment Setup

```bash
cp .env.example .env
# Add your API keys:
# EXPO_PUBLIC_GROQ_API_KEY=your_groq_key     (free at console.groq.com)
# EXPO_PUBLIC_GOOGLE_API_KEY=your_google_key (for Gemini AI)
```

Required API keys:
- **Groq** (free): For speech-to-text transcription via Whisper
- **Google Cloud**: Generative Language API (for Gemini summarization)

## Testing

Tests use Jest with babel-jest transform. Test files in `__tests__/` must match `**/*.test.ts?(x)`.

Coverage targets: `hooks/`, `services/`, `utils/`.
