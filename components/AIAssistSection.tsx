import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { VoiceNote } from '@/types';
import { useColors } from '@/hooks/useThemeColor';

interface AIAssistSectionProps {
  note: VoiceNote;
  onRunAIAssist: () => void;
  isProcessing: boolean;
}

export function AIAssistSection({ note, onRunAIAssist, isProcessing }: AIAssistSectionProps) {
  const colors = useColors();
  const hasAIContent = note.aiAssistStatus === 'done' && note.summary;
  const canRetry = note.aiAssistStatus === 'error' && note.transcriptStatus === 'done';

  return (
    <View style={[styles.section, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <FontAwesome name="magic" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>AI Assist</Text>
        </View>
        {((!hasAIContent && note.transcriptStatus === 'done') || canRetry) && (
          <Pressable
            style={[styles.generateButton, { backgroundColor: colors.primary }, isProcessing && styles.disabled]}
            onPress={onRunAIAssist}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FontAwesome name="bolt" size={14} color="white" />
                <Text style={styles.generateText}>{canRetry ? 'Retry' : 'Generate'}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analyzing transcript...
          </Text>
        </View>
      )}

      {hasAIContent && (
        <View style={styles.content}>
          {/* Summary */}
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Summary</Text>
            <Text style={[styles.blockContent, { color: colors.textPrimary }]}>{note.summary}</Text>
          </View>

          {/* Key Points */}
          {note.keyPoints && note.keyPoints.length > 0 && (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Key Points</Text>
              {note.keyPoints.map((point, index) => (
                <View key={index} style={styles.keyPoint}>
                  <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.keyPointText, { color: colors.textPrimary }]}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Title Suggestion */}
          {note.titleSuggestion && (
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Suggested Title</Text>
              <Text style={[styles.titleSuggestion, { color: colors.textPrimary }]}>
                {note.titleSuggestion}
              </Text>
            </View>
          )}
        </View>
      )}

      {!hasAIContent && !isProcessing && note.aiAssistStatus !== 'pending' && note.aiAssistStatus !== 'error' && (
        <Text style={[styles.placeholder, { color: colors.textTertiary }]}>
          Tap "Generate" to get a summary, key points, and title suggestion.
        </Text>
      )}

      {note.aiAssistStatus === 'error' && !isProcessing && (
        <Text style={[styles.error, { color: colors.error }]}>
          Failed to generate AI insights. Tap "Retry" to try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 24,
  },
  keyPointText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  titleSuggestion: {
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  placeholder: {
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
  },
});
