import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spacing } from '@/constants/theme';

export default function FindAStayScreen() {
  const router = useRouter();

  return (
    <Screen centered edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <StatusBadge label="In development" />
        <EmptyState
          title="No stays to show yet"
          message="Search for PGs, hostels, and hotels will be added after accounts are connected. Nothing on this screen is a live listing."
        />
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
