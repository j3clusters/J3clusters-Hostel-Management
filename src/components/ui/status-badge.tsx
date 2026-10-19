import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  label: string;
};

export function StatusBadge({ label }: Props) {
  return (
    <View style={styles.badge} accessibilityRole="text">
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.badgeBackground,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
