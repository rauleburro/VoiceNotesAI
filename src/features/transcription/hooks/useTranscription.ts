import { useCallback, useState } from 'react';
import { retryTranscription } from '../services/transcription';

interface UseTranscriptionResult {
  transcribe: (noteId: string, audioUri: string) => Promise<string | null>;
  isTranscribing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTranscription(): UseTranscriptionResult {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async (
    noteId: string,
    audioUri: string
  ): Promise<string | null> => {
    setIsTranscribing(true);
    setError(null);

    try {
      const transcript = await retryTranscription(noteId, audioUri);
      return transcript;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Transcription failed';
      setError(message);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    transcribe,
    isTranscribing,
    error,
    clearError,
  };
}
