import { File } from 'expo-file-system';
import { updateTranscript, updateTranscriptStatus } from '@/services/database';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

interface GroqTranscriptionResponse {
  text: string;
  error?: {
    message: string;
    type: string;
  };
}

export async function transcribeAudio(
  noteId: string,
  audioUri: string
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Groq API key not configured. Get a free key at console.groq.com');
  }

  try {
    // Update status to pending
    await updateTranscriptStatus(noteId, 'pending');

    // Create file reference
    const audioFile = new File(audioUri);

    if (!audioFile.exists) {
      throw new Error('Audio file not found');
    }

    // Create form data with file URI (React Native style)
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    // Make API request
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const data: GroqTranscriptionResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Transcription failed');
    }

    if (!data.text || data.text.trim() === '') {
      // No speech detected
      const transcript = '[No speech detected]';
      await updateTranscript(noteId, transcript, 'done');
      return transcript;
    }

    const transcript = data.text.trim();

    // Save to database
    await updateTranscript(noteId, transcript, 'done');

    return transcript;

  } catch (error) {
    console.error('Transcription error:', error);
    await updateTranscriptStatus(noteId, 'error');
    throw error;
  }
}

// Retry logic for failed transcriptions
export async function retryTranscription(
  noteId: string,
  audioUri: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeAudio(noteId, audioUri);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Transcription attempt ${attempt} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error('Transcription failed after retries');
}
