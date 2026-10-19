import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spacing } from '@/constants/theme';

export default function OwnerLoginScreen() {
  const router = useRouter();

  return (
    <Screen centered edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <StatusBadge label="In development" />
        <AppText variant="title">Owner Login</AppText>
        <AppText variant="body">
          Owner sign-in is not connected yet. This page only confirms you can open it from the welcome
          screen. No account is created or checked here.
        </AppText>
        <AppButton label="Back to welcome" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
});
