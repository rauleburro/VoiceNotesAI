# Phase 1: Project Setup

## Objective
Configure the Expo project for native module development and install all required dependencies.

---

## Tasks

### 1.1 Install Dependencies

```bash
# Core audio/storage
bunx expo install expo-av expo-sqlite expo-file-system

# Environment variables
bunx expo install expo-constants
bun add react-native-dotenv

# Utilities
bun add uuid
bun add -D @types/uuid

# Testing
bun add -D jest @testing-library/react-native jest-expo
```

### 1.2 Create Environment Configuration

**Create `.env.example`:**
```env
# Google Cloud API Key
# Enable: Cloud Speech-to-Text API, Generative Language API
EXPO_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
```

**Create `.env` (gitignored):**
```env
EXPO_PUBLIC_GOOGLE_API_KEY=AIza-actual-key-here
```

**Update `.gitignore`:**
```
.env
.env.local
```

### 1.3 Configure Expo for Native Modules

**Update `app.json`:**
```json
{
  "expo": {
    "name": "VoiceNotesAI",
    "slug": "voicenotesai",
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Allow VoiceNotesAI to access your microphone for recording voice notes."
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.yourname.voicenotesai",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Allow VoiceNotesAI to access your microphone for recording voice notes.",
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "package": "com.yourname.voicenotesai",
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

### 1.4 Generate Native Projects

```bash
# Generate ios and android folders
bunx expo prebuild

# Verify iOS builds
cd ios && pod install && cd ..

# Test builds
bun run ios
bun run android
```

### 1.5 Create Project Structure

```bash
# Create directories
mkdir -p app/note
mkdir -p components
mkdir -p hooks
mkdir -p services
mkdir -p modules/native-audio-session/{ios,android,src}
mkdir -p modules/native-level-meter/{ios,android,src}
mkdir -p types
mkdir -p __tests__
```

### 1.6 Setup TypeScript Types

**Create `types/index.ts`:**
```typescript
export type TranscriptStatus = 'pending' | 'done' | 'error';
export type AIAssistStatus = 'none' | 'pending' | 'done' | 'error';
export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown';

export interface VoiceNote {
  id: string;
  audioUri: string;
  durationMs: number;
  createdAt: number;
  transcript: string | null;
  transcriptStatus: TranscriptStatus;
  summary: string | null;
  keyPoints: string[] | null;
  titleSuggestion: string | null;
  aiAssistStatus: AIAssistStatus;
}

export interface NativeAudioSession {
  getRoute(): Promise<AudioRoute>;
  setRoute(route: 'speaker' | 'earpiece'): Promise<void>;
}

export interface NativeLevelMeter {
  start(): void;
  stop(): void;
  addListener(cb: (level: number) => void): { remove: () => void };
}
```

### 1.7 Remove Boilerplate

- Delete `app/(tabs)/` folder
- Delete `app/modal.tsx`
- Update `app/_layout.tsx` to use Stack navigation
- Delete unused components (`EditScreenInfo.tsx`, `StyledText.tsx`)

---

## Verification Checklist

- [ ] All dependencies installed without errors
- [ ] `.env` file created with OpenAI key
- [ ] `expo prebuild` completes successfully
- [ ] iOS simulator launches app
- [ ] Android emulator launches app
- [ ] Project structure created
- [ ] Types defined
- [ ] Boilerplate cleaned up

---

## Next Phase
[Phase 2: Native Modules](./PLAN_02_NATIVE_MODULES.md)
