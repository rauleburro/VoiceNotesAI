import { updateAIAssist, updateAIAssistStatus } from './database';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface AIAssistResult {
  summary: string;
  keyPoints: string[];
  titleSuggestion: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant that analyzes voice note transcripts.
Given a transcript, provide:
1. A concise summary (3-5 sentences)
2. Key points (3-5 bullet points)
3. A short title suggestion (5 words max)

Respond ONLY with valid JSON in this exact format:
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

// Retry logic for AI Assist with exponential backoff
export async function generateAIAssistWithRetry(
  noteId: string,
  transcript: string,
  maxRetries: number = 3
): Promise<AIAssistResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateAIAssist(noteId, transcript);
    } catch (error) {
      lastError = error as Error;
      console.warn(`AI Assist attempt ${attempt} failed:`, error);

      // Check if rate limited (429)
      const isRateLimited = lastError.message?.includes('429');

      if (attempt < maxRetries && isRateLimited) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }

      // For non-rate-limit errors, don't retry
      if (!isRateLimited) {
        break;
      }
    }
  }

  throw lastError || new Error('AI Assist failed after retries');
}
