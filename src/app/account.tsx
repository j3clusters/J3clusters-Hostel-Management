import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function AccountScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const roleLabel = role === 'admin' ? 'Administrator account' : role === 'owner' ? 'Owner account' : role === 'resident' ? 'Resident account' : 'Account';

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Account</AppText>
        <AppText variant="body">{user?.email ? `Signed in as ${user.email}` : 'Sign in to use an account.'}</AppText>
        <AppText variant="body">{roleLabel}</AppText>
        {role === 'admin' ? (
          <AppText variant="body">Administrator access is assigned in the database. Sign out and sign in again after a role change.</AppText>
        ) : null}
        {user ? (
          <>
            <AppButton label="Notifications" onPress={() => router.push('/notifications')} />
            <AppButton
              label="Sign out"
              variant="secondary"
              onPress={() => {
                void supabase?.auth.signOut();
              }}
            />
          </>
        ) : (
          <AppButton label="Sign in" onPress={() => router.push('/sign-in')} />
        )}
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
