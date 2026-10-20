import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Brand, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
};

export function PropertyPhotoPlaceholder({ label }: Props) {
  return (
    <View style={styles.frame} accessibilityLabel={`${label}. No photo has been added.`}>
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Rect x="4" y="8" width="28" height="20" rx="4" stroke={Brand.muted} strokeWidth="2" fill="none" />
        <Circle cx="13" cy="15" r="2.5" fill={Brand.muted} />
        <Path d="M8 24l6-6 4 4 3-3 7 7" stroke={Brand.muted} strokeWidth="2" fill="none" strokeLinejoin="round" />
      </Svg>
      <AppText variant="body" style={styles.label}>
        No photo yet
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 1.55,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: {
    color: Brand.muted,
  },
});
