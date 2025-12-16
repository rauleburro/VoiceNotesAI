import { requireNativeModule, EventEmitter } from 'expo-modules-core';

const NativeLevelMeterModule = requireNativeModule('NativeLevelMeter');

// Create emitter without strict typing for compatibility
const emitter = new EventEmitter(NativeLevelMeterModule);

export function start(): void {
  NativeLevelMeterModule.start();
}

export function stop(): void {
  NativeLevelMeterModule.stop();
}

export function addListener(callback: (level: number) => void): { remove: () => void } {
  // @ts-ignore - EventEmitter typing varies between expo-modules-core versions
  const subscription = emitter.addListener('onLevelChange', (event: { level: number }) => {
    callback(event.level);
  });

  return {
    remove: () => subscription.remove(),
  };
}

export default {
  start,
  stop,
  addListener,
};
