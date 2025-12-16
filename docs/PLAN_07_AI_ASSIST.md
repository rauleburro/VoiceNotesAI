# Phase 7: AI Assist (LLM Integration)

## Objective
Implement "AI Assist" feature to generate summaries, key points, and title suggestions using Google Gemini 2.5 Flash.

---

## Technology Choice: Gemini 2.5 Flash

### Why Gemini 2.5 Flash?

| Factor | Assessment |
|--------|------------|
| **Quality** | Excellent for summarization, latest Google Flash model |
| **Speed** | Optimized for low latency, ideal for mobile UX |
| **Cost** | Free tier available, very cost-effective |
| **Context** | 1M+ tokens (handles any transcript length) |
| **Integration** | Same Google API key as Speech-to-Text |

### Tradeoffs

**Pros:**
- Same provider as ASR (one API key)
- Very fast response times (Flash optimized)
- Generous free tier for development
- Massive context window (no truncation needed)
- Latest 2025 model with improved reasoning

**Cons:**
- Requires internet connection
- API key in client (MVP tradeoff)

**Alternative Considered:**
- Gemini 2.5 Pro: Higher quality but slower/costlier
- Gemini 2.0 Flash: Previous gen
- GPT-4o-mini: Different provider, separate key

---

## AI Assist Service

**File: `services/aiAssist.ts`**

```typescript
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
    } catch (parseError) {
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

// Alternative: Using Gemini with system instruction (cleaner)
export async function generateAIAssistWithSystemInstruction(
  noteId: string,
  transcript: string
): Promise<AIAssistResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  try {
    await updateAIAssistStatus(noteId, 'pending');

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [{ text: `Analyze this transcript:\n\n${transcript}` }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result: AIAssistResult = JSON.parse(content);

    await updateAIAssist(noteId, result.summary, result.keyPoints, result.titleSuggestion);
    return result;

  } catch (error) {
    await updateAIAssistStatus(noteId, 'error');
    throw error;
  }
}
```

---

## AI Assist Hook

**File: `hooks/useAIAssist.ts`**

```typescript
import { useState, useCallback } from 'react';
import { generateAIAssist, AIAssistResult } from '@/services/aiAssist';

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
      const result = await generateAIAssist(noteId, transcript);
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
```

---

## AI Assist UI Component

**File: `components/AIAssistSection.tsx`**

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { VoiceNote } from '@/types';

interface AIAssistSectionProps {
  note: VoiceNote;
  onRunAIAssist: () => void;
  isProcessing: boolean;
}

export function AIAssistSection({ note, onRunAIAssist, isProcessing }: AIAssistSectionProps) {
  const hasAIContent = note.aiAssistStatus === 'done' && note.summary;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assist</Text>
        {!hasAIContent && (
          <Pressable
            style={[styles.button, isProcessing && styles.buttonDisabled]}
            onPress={onRunAIAssist}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="magic" size={16} color="white" />
                <Text style={styles.buttonText}>Generate</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {note.aiAssistStatus === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to generate AI insights</Text>
          <Pressable onPress={onRunAIAssist} disabled={isProcessing}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      )}

      {note.aiAssistStatus === 'pending' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Analyzing with Gemini 2.5...</Text>
        </View>
      )}

      {hasAIContent && (
        <View style={styles.content}>
          {/* Summary */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{note.summary}</Text>
          </View>

          {/* Key Points */}
          {note.keyPoints && note.keyPoints.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Key Points</Text>
              {note.keyPoints.map((point, index) => (
                <View key={index} style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Regenerate option */}
          <Pressable
            style={styles.regenerateButton}
            onPress={onRunAIAssist}
            disabled={isProcessing}
          >
            <FontAwesome name="refresh" size={14} color="#4285F4" />
            <Text style={styles.regenerateText}>Regenerate</Text>
          </Pressable>
        </View>
      )}

      {note.aiAssistStatus === 'none' && !isProcessing && (
        <View style={styles.placeholder}>
          <FontAwesome name="lightbulb-o" size={32} color="#CCC" />
          <Text style={styles.placeholderText}>
            Get a summary and key points from your transcript
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4', // Google Blue
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {},
  subsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    color: '#4285F4',
    marginRight: 8,
    width: 12,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  regenerateText: {
    color: '#4285F4',
    fontSize: 14,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  retryText: {
    color: '#4285F4',
    fontSize: 14,
    marginTop: 8,
  },
});
```

---

## Handling Edge Cases

### Long Transcripts

Gemini 2.5 Flash has a massive context window, so truncation is rarely needed:

```typescript
// Only if you want to limit costs
const MAX_TRANSCRIPT_CHARS = 100000; // ~25K tokens

function prepareTranscript(transcript: string): string {
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) {
    return transcript;
  }

  // Keep beginning and end for context
  const halfMax = Math.floor(MAX_TRANSCRIPT_CHARS / 2);
  const beginning = transcript.slice(0, halfMax);
  const end = transcript.slice(-halfMax);

  return `${beginning}\n\n[... middle portion truncated for length ...]\n\n${end}`;
}
```

### Rate Limiting

```typescript
// Simple rate limit handling with exponential backoff
async function generateWithRetry(
  noteId: string,
  transcript: string,
  maxRetries = 3
): Promise<AIAssistResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateAIAssist(noteId, transcript);
    } catch (error: any) {
      if (error.message?.includes('429') && attempt < maxRetries) {
        // Rate limited - wait and retry
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Security Considerations

### Current (MVP) Approach
- API key stored in `.env` with `EXPO_PUBLIC_` prefix
- Calls made directly from client
- Key bundled in app binary

### Documented Tradeoffs
- **Risk**: API key can be extracted from app
- **Mitigation**: Use restricted API key with quotas
- **Production Solution**: Backend proxy that holds the key

### Google Cloud Security Settings
1. Restrict API key to specific APIs (Speech-to-Text, Generative Language)
2. Add app bundle ID / package name restrictions
3. Set daily quota limits
4. Monitor usage in Cloud Console

---

## Google Cloud Setup

### Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable "Generative Language API" (for Gemini)
4. Use same API key as Speech-to-Text (or create new one)

### API Key Best Practices
- Create separate keys for dev/prod
- Add application restrictions
- Set API restrictions (only enable needed APIs)
- Monitor usage regularly

---

## Verification Checklist

- [ ] "AI Assist" button appears when transcript is available
- [ ] Button disabled while processing
- [ ] Loading state shows "Analyzing with Gemini..."
- [ ] Summary displays (3-5 sentences)
- [ ] Key points display as bullet list
- [ ] Title suggestion updates note header
- [ ] Error state shows with retry option
- [ ] Regenerate option works
- [ ] Long transcripts handled correctly
- [ ] Results persist in database
- [ ] Works offline gracefully (shows error)
- [ ] Rate limiting handled with retry

---

## Next Phase
[Phase 8: Testing](./PLAN_08_TESTING.md)
