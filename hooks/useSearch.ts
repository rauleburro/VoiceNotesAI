import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceNote } from '@/types';
import * as db from '@/services/database';

const DEBOUNCE_MS = 300;

export function useSearch(allNotes: VoiceNote[]) {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<VoiceNote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await db.searchNotes(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search
    timeoutRef.current = setTimeout(() => {
      search(newQuery);
    }, DEBOUNCE_MS);
  }, [search]);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setResults([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return filtered notes or all notes
  const displayedNotes = query.trim() ? results : allNotes;

  return {
    query,
    setQuery,
    clearSearch,
    isSearching,
    displayedNotes,
    hasResults: results.length > 0,
    isFiltered: query.trim().length > 0,
  };
}
