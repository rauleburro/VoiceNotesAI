import { updateAIAssist, updateAIAssistStatus } from './database';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface AIAssistResult {
  summary: string;
  keyPoints: string[];
  titleSuggestion: string;
}

const SYSTEM_PROMPT = `Eres un asistente que analiza transcripciones de notas de voz.
Dado una transcripción, proporciona:
1. Un resumen conciso (3-5 oraciones)
2. Puntos clave (3-5 puntos)
3. Una sugerencia de título corto (máximo 5 palabras)

IMPORTANTE: Responde siempre en español.

Responde SOLO con JSON válido en este formato exacto:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "titleSuggestion": "..."
}`;

export async function generateAIAssist(
  noteId: string,
  transcript: string
): Promise<AIAssistResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  if (!transcript.trim()) {
    throw new Error('Transcript is empty');
  }

  try {
    // Update status to pending
    await updateAIAssistStatus(noteId, 'pending');

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nAnalyze this transcript:\n\n${transcript}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `AI Assist failed: ${response.status}`
      );
    }

    const data = await response.json();

    // Extract text from Gemini response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON response
    let result: AIAssistResult;
    try {
      result = JSON.parse(content);
    } catch {
      // Try to extract JSON from response if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid AI response format');
      }
    }

    // Validate response structure
    if (!result.summary || !Array.isArray(result.keyPoints) || !result.titleSuggestion) {
      throw new Error('Invalid AI response structure');
    }

    // Save to database
    await updateAIAssist(
      noteId,
      result.summary,
      result.keyPoints,
      result.titleSuggestion
    );

    return result;

  } catch (error) {
    console.error('AI Assist error:', error);
    await updateAIAssistStatus(noteId, 'error');
    throw error;
  }
}

// Check if error is retryable (rate limit, overloaded, or temporary)
function isRetryableError(error: Error): boolean {
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('overloaded') ||
    message.includes('temporarily') ||
    message.includes('try again')
  );
}

// Retry logic for AI Assist with exponential backoff
export async function generateAIAssistWithRetry(
  noteId: string,
  transcript: string,
  maxRetries: number = 5
): Promise<AIAssistResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateAIAssist(noteId, transcript);
    } catch (error) {
      lastError = error as Error;
      console.warn(`AI Assist attempt ${attempt}/${maxRetries} failed:`, error);

      const shouldRetry = isRetryableError(lastError);

      if (attempt < maxRetries && shouldRetry) {
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For non-retryable errors, don't retry
      if (!shouldRetry) {
        break;
      }
    }
  }

  throw lastError || new Error('AI Assist failed after retries');
}
