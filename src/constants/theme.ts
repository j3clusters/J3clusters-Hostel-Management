/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Brand = {
  primary: '#6254E8',
  primaryDark: '#493BC6',
  primaryLight: '#EEEBFF',
  primarySoft: '#F2F0FF',
  text: '#211C46',
  textSecondary: '#6F708A',
  muted: '#6F708A',
  background: '#F8F7FD',
  white: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F2F0FA',
  sand: '#FFB99A',
  accent: '#FFB99A',
  accentLight: '#FFF0E8',
  border: '#E7E4F4',
  badgeBackground: '#EEEBFF',
  success: '#16865C',
  successLight: '#E7F6EE',
  warning: '#D97706',
  warningLight: '#FFF4E5',
  danger: '#D92D20',
  dangerLight: '#FDECEC',
  info: '#476CFA',
  infoLight: '#EAF0FF',
} as const;

export const colors = Brand;

export const Shadow = {
  card: {
    shadowColor: '#211C46',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const Radius = {
  button: 16,
  card: 20,
  input: 14,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
