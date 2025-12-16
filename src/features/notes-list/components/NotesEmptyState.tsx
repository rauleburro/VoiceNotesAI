import React from 'react';
import { EmptyState } from '@/components/ui';

interface NotesEmptyStateProps {
  isFiltered: boolean;
}

export function NotesEmptyState({ isFiltered }: NotesEmptyStateProps) {
  if (isFiltered) {
    return (
      <EmptyState
        icon="search"
        title="No Results"
        message="No notes match your search. Try a different query."
      />
    );
  }

  return (
    <EmptyState
      icon="microphone"
      title="No Voice Notes Yet"
      message="Tap the record button to create your first voice note."
    />
  );
}
