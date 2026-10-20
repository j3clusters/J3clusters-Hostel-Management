import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
};

export function AppTextField({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
}: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
        placeholderTextColor={Brand.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: '100%',
    gap: Spacing.two,
  },
  label: {
    color: Brand.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    width: '100%',
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.input,
    borderWidth: 1,
    color: Brand.text,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
    paddingVertical: 14,
  },
});
