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
      <View style={styles.rule} />
      <AppText variant="subtitle" style={styles.subtitle}>
        Hostel Management
      </AppText>

      <View style={styles.hero}>
        <AppText variant="welcome">Welcome</AppText>
        <AppText variant="body" style={styles.tagline}>
          Find a Stay. Manage a Stay. Live Better.
        </AppText>
        <AppText variant="body" style={styles.tagline}>
          PG, hostel, and hotel stays across India.
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
            <AppButton
              label={role === 'owner' ? 'Owner profile' : 'Resident profile'}
              variant="secondary"
              onPress={() => router.push(role === 'owner' ? '/owner-profile' : '/resident-profile')}
            />
            <AppButton label="Saved stays" variant="secondary" onPress={() => router.push('/saved-stays')} />
            <AppButton label="Visit list" variant="secondary" onPress={() => router.push('/visit-list')} />
            <AppButton label="Enquiries" variant="secondary" onPress={() => router.push('/enquiries')} />
            {role === 'owner' ? (
              <AppButton label="My properties" onPress={() => router.push('/my-properties')} />
            ) : null}
            {role === 'owner' ? (
              <AppButton label="Add a property" onPress={() => router.push('/add-property')} />
            ) : null}
            {role === 'admin' ? (
              <AppButton label="Review owner requests" onPress={() => router.push('/admin-owners')} />
            ) : null}
            {role === 'admin' ? (
              <AppButton label="Review properties" onPress={() => router.push('/admin-properties')} />
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
    backgroundColor: Brand.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  logoText: {
    color: Brand.white,
    fontSize: 30,
    fontWeight: '800',
  },
  rule: {
    width: 48,
    height: 3,
    borderRadius: 999,
    backgroundColor: Brand.sand,
    marginTop: Spacing.three,
  },
  subtitle: {
    marginTop: Spacing.two,
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
