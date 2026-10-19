import { StyleSheet, Text, type TextProps } from 'react-native';

import { Brand } from '@/constants/theme';

type Variant = 'brand' | 'subtitle' | 'welcome' | 'title' | 'body' | 'eyebrow';

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
    fontSize: 28,
    fontWeight: '800',
    color: Brand.text,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Brand.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    color: Brand.muted,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    color: Brand.primary,
  },
});
