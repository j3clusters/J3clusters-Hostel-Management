import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function AppButton({ label, onPress, variant = 'primary' }: Props) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.base, isPrimary ? styles.primary : styles.secondary]}>
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Brand.primary,
  },
  secondary: {
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryLabel: {
    color: Brand.white,
  },
  secondaryLabel: {
    color: Brand.primary,
  },
});
