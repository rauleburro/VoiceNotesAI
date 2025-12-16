import { requireNativeModule } from 'expo-modules-core';

export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'unknown';

interface NativeAudioSessionModuleType {
  getRoute(): Promise<string>;
  setRoute(route: string): Promise<void>;
}

const NativeAudioSessionModule = requireNativeModule<NativeAudioSessionModuleType>('NativeAudioSession');

export async function getAudioRoute(): Promise<AudioRoute> {
  const route = await NativeAudioSessionModule.getRoute();
  return route as AudioRoute;
}

export async function setAudioRoute(route: 'speaker' | 'earpiece'): Promise<void> {
  return NativeAudioSessionModule.setRoute(route);
}

export default {
  getRoute: getAudioRoute,
  setRoute: setAudioRoute,
};
