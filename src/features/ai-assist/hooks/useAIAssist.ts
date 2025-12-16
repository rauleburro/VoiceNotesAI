import { useCallback, useState } from 'react';
import { generateAIAssistWithRetry, AIAssistResult } from '../services/aiAssist';

export type { AIAssistResult } from '../services/aiAssist';

interface UseAIAssistResult {
  runAIAssist: (noteId: string, transcript: string) => Promise<AIAssistResult | null>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAIAssist(): UseAIAssistResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAIAssist = useCallback(async (
    noteId: string,
    transcript: string
  ): Promise<AIAssistResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await generateAIAssistWithRetry(noteId, transcript);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI Assist failed';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    runAIAssist,
    isProcessing,
    error,
    clearError,
  };
}
