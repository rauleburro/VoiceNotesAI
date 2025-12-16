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
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <FontAwesome name="magic" size={18} color="#007AFF" />
          <Text style={styles.sectionTitle}>AI Assist</Text>
        </View>
        {!hasAIContent && note.transcriptStatus === 'done' && (
          <Pressable
            style={[styles.generateButton, isProcessing && styles.disabled]}
            onPress={onRunAIAssist}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="bolt" size={14} color="white" />
                <Text style={styles.generateText}>Generate</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing transcript...</Text>
        </View>
      )}

      {hasAIContent && (
        <View style={styles.content}>
          {/* Summary */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Summary</Text>
            <Text style={styles.blockContent}>{note.summary}</Text>
          </View>

          {/* Key Points */}
          {note.keyPoints && note.keyPoints.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Key Points</Text>
              {note.keyPoints.map((point, index) => (
                <View key={index} style={styles.keyPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.keyPointText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Title Suggestion */}
          {note.titleSuggestion && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Suggested Title</Text>
              <Text style={styles.titleSuggestion}>{note.titleSuggestion}</Text>
            </View>
          )}
        </View>
      )}

      {!hasAIContent && !isProcessing && note.aiAssistStatus !== 'pending' && (
        <Text style={styles.placeholder}>
          Tap "Generate" to get a summary, key points, and title suggestion.
        </Text>
      )}

      {note.aiAssistStatus === 'error' && (
        <Text style={styles.error}>
          Failed to generate AI insights. Tap "Generate" to try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#F8F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  disabled: {
    opacity: 0.7,
  },
  generateText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  content: {
    gap: 16,
  },
  block: {
    gap: 8,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#007AFF',
    lineHeight: 24,
  },
  keyPointText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  titleSuggestion: {
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#333',
  },
  placeholder: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
});
