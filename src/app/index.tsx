import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, role, profileMissing } = useAuth();

  return (
    <Screen centered>
      <View style={styles.logo} accessibilityRole="image" accessibilityLabel="J3cluster">
        <Text style={styles.logoText}>J3</Text>
      </View>
      <AppText variant="brand">J3cluster</AppText>
      <AppText variant="subtitle" style={styles.subtitle}>
        Hostel Management
      </AppText>

      <View style={styles.hero}>
        <AppText variant="welcome">Welcome</AppText>
        <AppText variant="body" style={styles.tagline}>
          Find a Stay. Manage a Stay. Live Better.
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton label="Find a Stay" onPress={() => router.push('/find-a-stay')} />
        {user ? (
          <>
            <AppText variant="body" style={styles.tagline}>
              Signed in as {user.email}
            </AppText>
            <AppText variant="body" style={styles.tagline}>
              {profileMissing
                ? 'Profile setup still needs to be run in Supabase.'
                : role === 'owner'
                  ? 'Owner account'
                  : role === 'admin'
                    ? 'Administrator account'
                    : role === 'resident'
                      ? 'Resident account'
                      : 'Account role is not assigned yet.'}
            </AppText>
            {role === 'admin' ? (
              <AppButton label="Review owner requests" onPress={() => router.push('/admin-owners')} />
            ) : null}
            <AppButton
              label="Sign out"
              variant="secondary"
              onPress={() => {
                void supabase?.auth.signOut();
              }}
            />
          </>
        ) : (
          <AppButton label="Sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
        )}
        <AppButton label="Owner Login" variant="secondary" onPress={() => router.push('/owner-login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  logoText: {
    color: Brand.white,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: Spacing.one,
  },
  hero: {
    alignItems: 'center',
    marginTop: Spacing.five,
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  tagline: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.three,
  },
});
