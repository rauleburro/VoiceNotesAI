# VoiceNotes AI

A cross-platform mobile app for voice notes with automatic transcription and AI-powered summaries.

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your Google API key

# 3. Generate native projects and run
bunx expo prebuild
bun run ios      # or: bun run android
```

> **Note**: You need a Groq API key (free) for transcription and a Google Cloud API key for Gemini AI. See [Setup](#setup) for details.

## Features

- Record voice notes with live audio level feedback
- Automatic transcription using Groq Whisper (whisper-large-v3-turbo)
- AI-generated summaries and key points using Google Gemini 2.5 Flash
- Search across all transcripts
- Edit transcripts manually
- Speaker/earpiece audio routing control
- Dark mode support

## Tech Stack

- **Framework**: React Native + Expo SDK 54
- **Language**: TypeScript
- **Navigation**: expo-router v6
- **ASR**: Groq Whisper (whisper-large-v3-turbo) - FREE
- **LLM**: Google Gemini 2.5 Flash
- **Storage**: SQLite (expo-sqlite)
- **Native Modules**: Custom Swift/Kotlin modules
- **E2E Testing**: Maestro

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Groq API key (free at console.groq.com)
- Google Cloud API key (for Gemini AI)

### Getting API Keys

**Groq API Key (FREE - for transcription):**
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Create an API key

**Google API Key (for Gemini AI):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Generative Language API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > API Key**
6. (Recommended) Restrict the key to Generative Language API only

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/voicenotesai.git
cd voicenotesai

# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Add your API keys to .env
EXPO_PUBLIC_GROQ_API_KEY=gsk_your-groq-key-here
EXPO_PUBLIC_GOOGLE_API_KEY=AIza-your-google-key-here

# Generate native projects
bunx expo prebuild
```

### Running the App

```bash
# Start development server
bun start

# Run on iOS simulator
bun run ios

# Run on Android emulator
bun run android
```

### Building

**Android APK:**
```bash
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

**iOS (Xcode):**
```bash
open ios/VoiceNotesAI.xcworkspace
# Build and run from Xcode
```

## Custom Native Modules

### NativeAudioSession

Controls audio output routing between speaker and earpiece.

**API:**
```typescript
import { getAudioRoute, setAudioRoute } from '@/modules/native-audio-session';

// Get current audio route
const route = await getAudioRoute();
// Returns: 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown'

// Set audio route
await setAudioRoute('speaker');
await setAudioRoute('earpiece');
```

**Implementation:**
- iOS: Uses `AVAudioSession` to manage audio routing
- Android: Uses `AudioManager` to control speakerphone mode

### NativeLevelMeter

Streams live microphone audio levels for visual feedback during recording.

**API:**
```typescript
import NativeLevelMeter from '@/modules/native-level-meter';

// Start monitoring
NativeLevelMeter.start();

// Subscribe to level updates (0-1 normalized, ~15Hz)
const subscription = NativeLevelMeter.addListener((level) => {
  console.log('Current level:', level);
});

// Stop monitoring
NativeLevelMeter.stop();
subscription.remove();
```

**Implementation:**
- iOS: Uses `AVAudioRecorder` metering with timer-based polling
- Android: Uses `AudioRecord` with RMS calculation on audio buffer

## ASR Choice: Groq Whisper (whisper-large-v3-turbo)

### Why Groq Whisper?

| Factor | Assessment |
|--------|------------|
| Accuracy | OpenAI Whisper large-v3-turbo, state-of-the-art |
| Speed | Groq's LPU provides extremely fast inference (~10x realtime) |
| Cost | **FREE** (generous free tier) |
| Languages | 100+ languages with auto-detection |
| Integration | Simple REST API, OpenAI-compatible |

### Tradeoffs

**Pros:**
- Excellent transcription quality (Whisper large-v3-turbo)
- **Completely free** for development and reasonable usage
- Extremely fast transcription via Groq's LPU
- Simple API integration
- Automatic punctuation

**Cons:**
- Requires internet connection
- Rate limits on free tier (but generous)
- 25MB file size limit

### Handling Limitations

- **Retries**: Exponential backoff retry logic implemented
- **Errors**: Clear error messages displayed to user
- **Offline**: Notes saved locally, transcription pending until online

## LLM Choice: Google Gemini 2.5 Flash

### Why Gemini 2.5 Flash?

| Factor | Assessment |
|--------|------------|
| Quality | Excellent for summarization, latest Google Flash model |
| Speed | Optimized for low latency, ideal for mobile UX |
| Cost | Free tier available, very cost-effective |
| Context | 1M+ tokens (handles any transcript length) |

### Tradeoffs

**Pros:**
- Same provider as ASR (one Google API key)
- Very fast response times for good UX
- Generous free tier for development
- Massive context window (no truncation needed)
- Latest 2025 model with improved reasoning

**Cons:**
- Requires internet connection
- API key exposed in client app (MVP tradeoff)

### Production Recommendations

For a production app:
1. Create a backend proxy to secure API keys
2. Implement user authentication
3. Add rate limiting per user
4. Set quota limits in Google Cloud Console

## Security Considerations

### Current MVP Approach

- API key stored in `.env` with `EXPO_PUBLIC_` prefix
- Direct API calls from client
- Key bundled in app binary

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API key extraction | Use restricted key with spending limits |
| Unauthorized usage | Monitor API dashboard for anomalies |
| Data privacy | Audio processed by Google Cloud |

### Production Recommendations

1. **Backend Proxy**: Hide API keys behind authenticated endpoint
2. **Key Rotation**: Implement key rotation mechanism
3. **Usage Limits**: Per-user rate limiting
4. **Audit Logging**: Track all API calls

## Testing

### Unit Tests

```bash
# Run all tests
bun test

# Or using bunx jest directly
bunx jest

# Run with coverage
bunx jest --coverage
```

**Unit Test Coverage:**
- `useSearch` hook: debouncing, filtering, clearing
- Format utilities: duration, date, excerpt formatting

### E2E Tests (Maestro)

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run E2E tests (app must be running in simulator)
maestro test .maestro/

# Run specific test
maestro test .maestro/record-flow.yaml
```

**E2E Test Coverage:**
- `record-flow.yaml`: Complete flow - Record → Note appears → Transcription shown → Detail view

## Project Structure

```
VoiceNotesAI/
├── app/                    # Expo Router screens
│   ├── _layout.tsx
│   ├── index.tsx          # Notes list
│   └── note/[id].tsx      # Note detail
├── components/            # UI components
├── hooks/                 # Custom React hooks
├── services/              # Business logic
├── modules/               # Native modules
│   ├── native-audio-session/
│   └── native-level-meter/
├── types/                 # TypeScript types
└── __tests__/            # Test files
```

## Troubleshooting

### "Cannot find native module" error on iOS

If you see errors like `Cannot find native module 'NativeLevelMeter'` or `NativeAudioSession`:

```bash
# Clean and rebuild
bunx expo prebuild --clean
bun run ios
```

This regenerates the native projects and ensures custom modules are properly linked.

### iOS build fails with CocoaPods errors

```bash
cd ios && pod install --repo-update && cd ..
bun run ios
```

### Android build fails

```bash
cd android && ./gradlew clean && cd ..
bun run android
```

## Known Limitations

1. **No offline transcription**: Requires internet for ASR
2. **Single language**: UI in English only
3. **No cloud sync**: Data stored locally only
4. **No export**: Cannot export notes/transcripts

## Future Improvements

- [ ] Offline transcription queue
- [ ] Cloud backup/sync
- [ ] Export to text/PDF
- [ ] Multiple language UI
- [ ] Waveform visualization from audio file
- [ ] Share functionality

## License

MIT
