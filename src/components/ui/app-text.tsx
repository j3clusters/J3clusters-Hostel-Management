import { StyleSheet, Text, type TextProps } from 'react-native';

import { Brand } from '@/constants/theme';

type Variant = 'brand' | 'subtitle' | 'welcome' | 'title' | 'section' | 'body' | 'caption' | 'eyebrow';

type Props = TextProps & {
  variant?: Variant;
};

export function AppText({ variant = 'body', style, ...rest }: Props) {
  return <Text style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: Brand.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.primary,
    textAlign: 'center',
  },
  welcome: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: Brand.text,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Brand.text,
  },
  section: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: Brand.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: Brand.muted,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.primary,
  },
});
