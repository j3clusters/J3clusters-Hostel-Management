import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string;
  tone?: Tone;
};

const toneStyle = {
  neutral: { background: Brand.badgeBackground, text: Brand.primary },
  success: { background: Brand.successLight, text: Brand.success },
  warning: { background: Brand.warningLight, text: Brand.warning },
  danger: { background: Brand.dangerLight, text: Brand.danger },
  info: { background: Brand.infoLight, text: Brand.info },
} as const;

export function StatusBadge({ label, tone = 'neutral' }: Props) {
  const colors = toneStyle[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]} accessibilityRole="text">
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
