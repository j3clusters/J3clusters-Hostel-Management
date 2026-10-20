import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';

type Props = {
  rows: { label: string; value: string }[];
};

export function MetricGrid({ rows }: Props) {
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.label} style={styles.card}>
          <AppText variant="caption">{row.label}</AppText>
          <AppText variant="section" style={styles.value}>
            {row.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    gap: Spacing.one,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    ...Shadow.card,
  },
  value: {
    color: Brand.text,
  },
});
