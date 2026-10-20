import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Brand, Radius } from '@/constants/theme';

type Props = {
  label: string;
};

export function PropertyPhotoPlaceholder({ label }: Props) {
  return (
    <View style={styles.frame} accessibilityLabel={`${label}. No photo has been added.`}>
      <View style={styles.mark} />
      <AppText variant="body" style={styles.label}>
        No photo yet
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 1.6,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    backgroundColor: Brand.text,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mark: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: Brand.sand,
  },
  label: {
    color: Brand.white,
  },
});
