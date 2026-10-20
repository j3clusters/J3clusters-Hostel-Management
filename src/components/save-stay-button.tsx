import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  saved: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function SaveStayButton({ saved, disabled = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved stays' : 'Save this stay'}
      accessibilityState={{ disabled, selected: saved }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={styles.button}>
      <Text style={[styles.heart, saved && styles.saved]}>{saved ? '♥' : '♡'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.white,
  },
  heart: {
    color: Brand.text,
    fontSize: 22,
    lineHeight: 26,
  },
  saved: {
    color: Brand.danger,
  },
});
