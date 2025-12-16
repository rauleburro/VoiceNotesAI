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

> **Note**: You need a Google Cloud API key with Speech-to-Text and Generative Language APIs enabled. See [Setup](#setup) for details.

## Features

- Record voice notes with live audio level feedback
- Automatic transcription using Google Cloud Speech-to-Text (Chirp model)
- AI-generated summaries and key points using Google Gemini 2.5 Flash
- Search across all transcripts
- Edit transcripts manually
- Speaker/earpiece audio routing control
- Dark mode support

## Tech Stack

- **Framework**: React Native + Expo SDK 54
- **Language**: TypeScript
- **Navigation**: expo-router v6
- **ASR**: Google Cloud Speech-to-Text V2 (Chirp model)
- **LLM**: Google Gemini 2.5 Flash
- **Storage**: SQLite (expo-sqlite)
- **Native Modules**: Custom Swift/Kotlin modules

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Google Cloud API key

### Getting a Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Cloud Speech-to-Text API** (for transcription)
   - **Generative Language API** (for Gemini AI summaries)
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > API Key**
6. (Recommended) Restrict the key to only the APIs above

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/voicenotesai.git
cd voicenotesai

# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Add your Google API key to .env
EXPO_PUBLIC_GOOGLE_API_KEY=AIza-your-key-here

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

## ASR Choice: Google Cloud Speech-to-Text V2 (Chirp)

### Why Google Speech-to-Text with Chirp?

| Factor | Assessment |
|--------|------------|
| Accuracy | Chirp is Google's latest ASR model, state-of-the-art |
| Languages | 100+ languages with auto-detection |
| Integration | REST API, same provider as Gemini LLM |
| Cost | $0.016/minute (standard), $0.024/minute (Chirp) |
| Features | Automatic punctuation, speaker diarization |

### Tradeoffs

**Pros:**
- Excellent transcription quality with latest Chirp model
- Same Google Cloud project for ASR + LLM (single API key)
- Automatic punctuation and formatting
- Great multi-language support

**Cons:**
- Requires internet connection
- 10MB file size limit for sync transcription
- Slightly more complex API than some alternatives

### Handling Limitations

- **Long recordings**: Could use async API for files >10MB (not in MVP)
- **Offline**: Queued for transcription when online (not implemented in MVP)
- **Rate limits**: Exponential backoff retry logic implemented

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

```bash
# Run all tests
bun test

# Or using bunx jest directly
bunx jest

# Run with coverage
bunx jest --coverage
```

### Test Coverage

- **Unit Tests**: useSearch hook (debouncing, filtering), format utilities (duration, date, excerpt)

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
