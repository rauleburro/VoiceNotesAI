import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Paths, Directory, File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

export async function requestPermissions(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

export async function configureAudioModeForRecording(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionModeAndroid: 'duckOthers',
  });
}

export async function configureAudioModeForPlayback(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionModeAndroid: 'duckOthers',
  });
}

export interface SaveRecordingResult {
  uri: string;
  durationMs: number;
}

export async function saveRecording(tempUri: string, durationMs: number): Promise<SaveRecordingResult> {
  // Ensure recordings directory exists
  const recordingsDir = new Directory(Paths.document, 'recordings');
  if (!recordingsDir.exists) {
    recordingsDir.create();
  }

  // Move to permanent location with unique filename
  const filename = `recording_${randomUUID()}.m4a`;
  const tempFile = new File(tempUri);

  if (!tempFile.exists) {
    throw new Error(`Recording file not found at: ${tempUri}`);
  }

  const permanentFile = new File(recordingsDir, filename);
  tempFile.move(permanentFile);

  return {
    uri: permanentFile.uri,
    durationMs,
  };
}

export async function deleteRecordingFile(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.error('Error deleting recording file:', e);
  }
}
