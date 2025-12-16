# Phase 8: Testing

## Objective
Implement minimum required tests: 2 unit tests + 1 integration test.

---

## Testing Setup

### Install Dependencies

```bash
bun add -D jest @testing-library/react-native jest-expo @types/jest
```

### Jest Configuration

**File: `jest.config.js`**

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Unit Tests (2 Required)

### Test 1: useSearch Hook

**File: `__tests__/hooks/useSearch.test.ts`**

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSearch } from '@/hooks/useSearch';
import * as db from '@/services/database';

// Mock database
jest.mock('@/services/database', () => ({
  searchNotes: jest.fn(),
}));

const mockNotes = [
  {
    id: '1',
    audioUri: 'file://audio1.m4a',
    durationMs: 5000,
    createdAt: Date.now(),
    transcript: 'Hello world this is a test',
    transcriptStatus: 'done' as const,
    summary: null,
    keyPoints: null,
    titleSuggestion: null,
    aiAssistStatus: 'none' as const,
  },
  {
    id: '2',
    audioUri: 'file://audio2.m4a',
    durationMs: 10000,
    createdAt: Date.now() - 1000,
    transcript: 'Another transcript here',
    transcriptStatus: 'done' as const,
    summary: null,
    keyPoints: null,
    titleSuggestion: null,
    aiAssistStatus: 'none' as const,
  },
];

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns all notes when query is empty', () => {
    const { result } = renderHook(() => useSearch(mockNotes));

    expect(result.current.displayedNotes).toEqual(mockNotes);
    expect(result.current.isFiltered).toBe(false);
  });

  it('debounces search queries', async () => {
    (db.searchNotes as jest.Mock).mockResolvedValue([mockNotes[0]]);

    const { result } = renderHook(() => useSearch(mockNotes));

    // Type quickly
    act(() => {
      result.current.setQuery('h');
    });
    act(() => {
      result.current.setQuery('he');
    });
    act(() => {
      result.current.setQuery('hel');
    });
    act(() => {
      result.current.setQuery('hello');
    });

    // Search should not be called yet (debouncing)
    expect(db.searchNotes).not.toHaveBeenCalled();

    // Advance timers past debounce period (300ms)
    act(() => {
      jest.advanceTimersByTime(350);
    });

    // Now search should be called once with final query
    await waitFor(() => {
      expect(db.searchNotes).toHaveBeenCalledTimes(1);
      expect(db.searchNotes).toHaveBeenCalledWith('hello');
    });
  });

  it('clears search correctly', async () => {
    (db.searchNotes as jest.Mock).mockResolvedValue([mockNotes[0]]);

    const { result } = renderHook(() => useSearch(mockNotes));

    // Perform search
    act(() => {
      result.current.setQuery('hello');
    });
    act(() => {
      jest.advanceTimersByTime(350);
    });

    // Clear search
    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.isFiltered).toBe(false);
    expect(result.current.displayedNotes).toEqual(mockNotes);
  });
});
```

### Test 2: formatDuration Utility

**File: `__tests__/utils/formatDuration.test.ts`**

```typescript
// First, extract the function to a utility file
// File: utils/format.ts
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function getExcerpt(text: string | null, maxLength: number = 80): string {
  if (!text) return 'No transcript yet...';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
```

```typescript
// File: __tests__/utils/format.test.ts
import { formatDuration, getExcerpt } from '@/utils/format';

describe('formatDuration', () => {
  it('formats zero milliseconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds correctly', () => {
    expect(formatDuration(5000)).toBe('0:05');
    expect(formatDuration(30000)).toBe('0:30');
    expect(formatDuration(59000)).toBe('0:59');
  });

  it('formats minutes correctly', () => {
    expect(formatDuration(60000)).toBe('1:00');
    expect(formatDuration(90000)).toBe('1:30');
    expect(formatDuration(300000)).toBe('5:00');
  });

  it('formats longer durations', () => {
    expect(formatDuration(3600000)).toBe('60:00'); // 1 hour
    expect(formatDuration(3661000)).toBe('61:01');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(61000)).toBe('1:01');
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(69000)).toBe('1:09');
  });
});

describe('getExcerpt', () => {
  it('returns placeholder for null text', () => {
    expect(getExcerpt(null)).toBe('No transcript yet...');
  });

  it('returns full text when under limit', () => {
    expect(getExcerpt('Hello world')).toBe('Hello world');
  });

  it('truncates long text with ellipsis', () => {
    const longText = 'A'.repeat(100);
    const result = getExcerpt(longText, 80);
    expect(result.length).toBeLessThanOrEqual(83); // 80 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('respects custom max length', () => {
    const text = 'Hello world, this is a longer string';
    expect(getExcerpt(text, 10)).toBe('Hello worl...');
  });
});
```

---

## Integration Test (1 Required)

### Recording Flow Test

**File: `__tests__/integration/recordingFlow.test.tsx`**

```typescript
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import NotesListScreen from '@/app/index';
import { NotesProvider } from '@/contexts/NotesContext';
import * as RecordingService from '@/services/recording';
import * as TranscriptionService from '@/services/transcription';
import * as db from '@/services/database';

// Mock native modules
jest.mock('@/modules/native-level-meter', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@/modules/native-audio-session', () => ({
  getRoute: jest.fn().mockResolvedValue('speaker'),
  setRoute: jest.fn().mockResolvedValue(undefined),
}));

// Mock services
jest.mock('@/services/recording');
jest.mock('@/services/transcription');
jest.mock('@/services/database');

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          stopAndUnloadAsync: jest.fn(),
          getURI: () => 'file://test-recording.m4a',
          getStatusAsync: jest.fn().mockResolvedValue({ durationMillis: 5000 }),
        },
      }),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    <NotesProvider>
      {children}
    </NotesProvider>
  </NavigationContainer>
);

describe('Recording Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (db.getAllNotes as jest.Mock).mockResolvedValue([]);
    (db.createNote as jest.Mock).mockImplementation((note) => ({
      ...note,
      transcript: null,
      transcriptStatus: 'pending',
      summary: null,
      keyPoints: null,
      titleSuggestion: null,
      aiAssistStatus: 'none',
    }));

    (RecordingService.requestPermissions as jest.Mock).mockResolvedValue(true);
    (RecordingService.startRecording as jest.Mock).mockResolvedValue(undefined);
    (RecordingService.stopRecording as jest.Mock).mockResolvedValue({
      uri: 'file://test-recording.m4a',
      durationMs: 5000,
    });

    (TranscriptionService.transcribeAudio as jest.Mock).mockResolvedValue(
      'This is the transcribed text.'
    );
  });

  it('records a note, shows it in list, and displays transcription status', async () => {
    render(<NotesListScreen />, { wrapper });

    // Initially shows empty state
    expect(screen.getByText('No voice notes yet')).toBeTruthy();

    // Find and tap record button
    const recordButton = screen.getByRole('button');
    fireEvent.press(recordButton);

    // Should show recording UI
    await waitFor(() => {
      expect(RecordingService.startRecording).toHaveBeenCalled();
    });

    // Simulate recording overlay (would need to check for Recording text/timer)
    // For this test, we'll simulate the stop action

    // Mock the stop recording
    await waitFor(() => {
      expect(screen.getByText(/Recording/i)).toBeTruthy();
    });

    // Tap stop button
    const stopButton = screen.getByTestId('stop-button'); // Add testID to stop button
    fireEvent.press(stopButton);

    // Wait for note to appear in list
    await waitFor(() => {
      expect(db.createNote).toHaveBeenCalled();
    });

    // Note should appear with pending status
    await waitFor(() => {
      expect(screen.getByText('Transcribing...')).toBeTruthy();
    });

    // Transcription completes
    await waitFor(() => {
      expect(TranscriptionService.transcribeAudio).toHaveBeenCalled();
    });

    // Update mock to return note with transcript
    (db.getAllNotes as jest.Mock).mockResolvedValue([{
      id: 'test-id',
      audioUri: 'file://test-recording.m4a',
      durationMs: 5000,
      createdAt: Date.now(),
      transcript: 'This is the transcribed text.',
      transcriptStatus: 'done',
      summary: null,
      keyPoints: null,
      titleSuggestion: null,
      aiAssistStatus: 'none',
    }]);

    // Verify transcript excerpt shows
    await waitFor(() => {
      expect(screen.getByText(/This is the transcribed/i)).toBeTruthy();
    });
  });

  it('handles recording permission denied', async () => {
    (RecordingService.requestPermissions as jest.Mock).mockResolvedValue(false);
    (RecordingService.startRecording as jest.Mock).mockRejectedValue(
      new Error('Microphone permission not granted')
    );

    render(<NotesListScreen />, { wrapper });

    const recordButton = screen.getByRole('button');
    fireEvent.press(recordButton);

    // Should show error or remain in idle state
    await waitFor(() => {
      // Recording should not start
      expect(screen.queryByText(/Recording/i)).toBeNull();
    });
  });

  it('handles transcription error with retry option', async () => {
    (TranscriptionService.transcribeAudio as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('Transcribed after retry');

    render(<NotesListScreen />, { wrapper });

    // Start and complete recording
    const recordButton = screen.getByRole('button');
    fireEvent.press(recordButton);

    await waitFor(() => {
      expect(RecordingService.startRecording).toHaveBeenCalled();
    });

    // Stop recording (simulated)
    (RecordingService.stopRecording as jest.Mock).mockResolvedValue({
      uri: 'file://test.m4a',
      durationMs: 3000,
    });

    // Transcription fails
    await waitFor(() => {
      expect(TranscriptionService.transcribeAudio).toHaveBeenCalled();
    });

    // Should show error status
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeTruthy();
    });
  });
});
```

---

## Test Utilities

**File: `__tests__/utils/testUtils.tsx`**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { NotesProvider } from '@/contexts/NotesContext';

export function createTestWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationContainer>
        <NotesProvider>
          {children}
        </NotesProvider>
      </NavigationContainer>
    );
  };
}

export const mockVoiceNote = (overrides = {}) => ({
  id: 'test-id',
  audioUri: 'file://test.m4a',
  durationMs: 5000,
  createdAt: Date.now(),
  transcript: null,
  transcriptStatus: 'pending' as const,
  summary: null,
  keyPoints: null,
  titleSuggestion: null,
  aiAssistStatus: 'none' as const,
  ...overrides,
});
```

---

## Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test -- --coverage

# Run specific test file
bun test -- __tests__/hooks/useSearch.test.ts

# Watch mode
bun test -- --watch
```

---

## Verification Checklist

- [ ] Jest configured correctly with expo preset
- [ ] Path aliases work in tests
- [ ] Unit test 1: useSearch hook passes
- [ ] Unit test 2: formatDuration utility passes
- [ ] Integration test: recording flow passes
- [ ] Tests can run in CI (no interactive prompts)
- [ ] Coverage report generates
- [ ] All mocks are properly isolated

---

## Next Phase
[Phase 9: Delivery](./PLAN_09_DELIVERY.md)
