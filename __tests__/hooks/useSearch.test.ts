import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSearch } from '@/features/search/hooks/useSearch';
import * as db from '@/services/database';
import { VoiceNote } from '@/types';

// Mock database
jest.mock('@/services/database', () => ({
  searchNotes: jest.fn(),
}));

const mockNotes: VoiceNote[] = [
  {
    id: '1',
    audioUri: 'file://audio1.m4a',
    durationMs: 5000,
    createdAt: Date.now(),
    transcript: 'Hello world this is a test',
    transcriptStatus: 'done',
    summary: null,
    keyPoints: null,
    titleSuggestion: null,
    aiAssistStatus: 'none',
  },
  {
    id: '2',
    audioUri: 'file://audio2.m4a',
    durationMs: 10000,
    createdAt: Date.now() - 1000,
    transcript: 'Another transcript here',
    transcriptStatus: 'done',
    summary: null,
    keyPoints: null,
    titleSuggestion: null,
    aiAssistStatus: 'none',
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

  it('updates isFiltered when query is set', () => {
    const { result } = renderHook(() => useSearch(mockNotes));

    expect(result.current.isFiltered).toBe(false);

    act(() => {
      result.current.setQuery('hello');
    });

    expect(result.current.isFiltered).toBe(true);
  });

  it('returns search results when search completes', async () => {
    const filteredNotes = [mockNotes[0]];
    (db.searchNotes as jest.Mock).mockResolvedValue(filteredNotes);

    const { result } = renderHook(() => useSearch(mockNotes));

    act(() => {
      result.current.setQuery('hello');
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(result.current.displayedNotes).toEqual(filteredNotes);
    });
  });
});
