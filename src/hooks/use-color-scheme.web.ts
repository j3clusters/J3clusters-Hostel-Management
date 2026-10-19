import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

function subscribe(onChange: () => void) {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

function getSnapshot() {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light' as const);
}
