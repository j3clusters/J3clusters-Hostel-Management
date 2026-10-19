import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Spacing } from '@/constants/theme';

type Props = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.container}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'left',
  },
  message: {
    textAlign: 'left',
  },
});
