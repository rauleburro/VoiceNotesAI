// Voice Note Types

export type TranscriptStatus = 'pending' | 'done' | 'error';
export type AIAssistStatus = 'none' | 'pending' | 'done' | 'error';
export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown';

export interface VoiceNote {
  id: string;
  audioUri: string;
  durationMs: number;
  createdAt: number;
  transcript: string | null;
  transcriptStatus: TranscriptStatus;
  summary: string | null;
  keyPoints: string[] | null;
  titleSuggestion: string | null;
  aiAssistStatus: AIAssistStatus;
}

// Native Module Types

export interface NativeAudioSessionModule {
  getRoute(): Promise<AudioRoute>;
  setRoute(route: 'speaker' | 'earpiece'): Promise<void>;
}

export interface LevelChangeEvent {
  level: number;
}

export interface NativeLevelMeterModule {
  start(): void;
  stop(): void;
}

// Recording Types

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

export type RecordingState = 'idle' | 'recording' | 'stopping';

// AI Assist Types

export interface AIAssistResult {
  summary: string;
  keyPoints: string[];
  titleSuggestion: string;
}
