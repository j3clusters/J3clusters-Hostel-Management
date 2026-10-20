import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WelcomeIllustration } from '@/components/illustrations/brand-illustrations';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, role, profileMissing } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || (role !== 'owner' && role !== 'resident' && role !== 'admin')) {
        return;
      }

      let active = true;
      void supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .then(({ count }) => {
          if (active) {
            setUnreadCount(count ?? 0);
          }
        });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  const homeHref = role === 'owner' ? '/owner-report' : role === 'admin' ? '/admin-home' : '/find-a-stay';
  const roleLabel = profileMissing
    ? 'Profile setup still needs to be run in Supabase.'
    : role === 'owner'
      ? 'Owner account'
      : role === 'admin'
        ? 'Administrator account'
        : role === 'resident'
          ? 'Resident account'
          : 'Account role is not assigned yet.';

  return (
    <Screen centered>
      <View style={styles.logo} accessibilityRole="image" accessibilityLabel="J3 Cluster">
        <Text style={styles.logoText}>J3</Text>
      </View>
      <WelcomeIllustration />
      <AppText variant="brand">J3 Cluster</AppText>
      <AppText variant="welcome" style={styles.headline}>
        Find your place. Feel at home.
      </AppText>
      <AppText variant="body" style={styles.tagline}>
        PG, hostel, and hotel stays across India.
      </AppText>

      <View style={styles.actions}>
        {user ? (
          <>
            <AppText variant="body" style={styles.tagline}>
              Signed in as {user.email}
            </AppText>
            <AppText variant="body" style={styles.tagline}>
              {roleLabel}
            </AppText>
            <AppButton label={role === 'owner' ? 'Open owner home' : role === 'admin' ? 'Open admin home' : 'Browse stays'} onPress={() => router.push(homeHref)} />
            {role === 'owner' || role === 'resident' || role === 'admin' ? (
              <AppButton
                label={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
                variant="secondary"
                onPress={() => router.push('/notifications')}
              />
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
          <>
            <AppButton label="Sign in" onPress={() => router.push('/sign-in')} />
            <AppButton label="Create account" variant="secondary" onPress={() => router.push('/sign-up')} />
            <AppButton label="Browse stays" variant="secondary" onPress={() => router.push('/find-a-stay')} />
          </>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push('/owner-login')}>
          <AppText variant="body" style={styles.link}>
            Owner login
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  logoText: {
    color: Brand.white,
    fontSize: 24,
    fontWeight: '800',
  },
  headline: {
    marginTop: Spacing.three,
  },
  tagline: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  actions: {
    width: '100%',
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  link: {
    color: Brand.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
});
