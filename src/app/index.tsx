import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
            {role === 'owner' || role === 'resident' || role === 'admin' ? (
              <AppButton label="Today" onPress={() => router.push('/today')} />
            ) : null}
            {role === 'owner' || role === 'resident' || role === 'admin' ? (
              <AppButton label="This week" variant="secondary" onPress={() => router.push('/week')} />
            ) : null}
            <AppButton label="Visit list" variant="secondary" onPress={() => router.push('/visit-list')} />
            <AppButton label="Enquiries" variant="secondary" onPress={() => router.push('/enquiries')} />
            <AppButton label="Booking requests" variant="secondary" onPress={() => router.push('/booking-requests')} />
            {role === 'resident' ? <AppButton label="My stay" onPress={() => router.push('/resident-report')} /> : null}
            {role === 'owner' || role === 'resident' || role === 'admin' ? (
              <AppButton
                label={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
                variant="secondary"
                onPress={() => router.push('/notifications')}
              />
            ) : null}
            {role === 'owner' || role === 'resident' ? (
              <AppButton label="Maintenance" variant="secondary" onPress={() => router.push('/maintenance')} />
            ) : null}
            {role === 'owner' || role === 'resident' ? (
              <AppButton label="Leave" variant="secondary" onPress={() => router.push('/leave')} />
            ) : null}
            {role === 'owner' || role === 'resident' ? (
              <AppButton label="Notices" variant="secondary" onPress={() => router.push('/announcements')} />
            ) : null}
            {role === 'owner' || role === 'resident' ? (
              <AppButton label="Stay reviews" variant="secondary" onPress={() => router.push('/stay-reviews')} />
            ) : null}
            {role === 'owner' ? (
              <AppButton label="My properties" onPress={() => router.push('/my-properties')} />
            ) : null}
            {role === 'owner' ? <AppButton label="My report" onPress={() => router.push('/owner-report')} /> : null}
            {role === 'owner' ? <AppButton label="Expenses" onPress={() => router.push('/expenses')} /> : null}
            {role === 'owner' ? (
              <AppButton label="Add a property" onPress={() => router.push('/add-property')} />
            ) : null}
            {role === 'admin' ? (
              <AppButton label="Review owner requests" onPress={() => router.push('/admin-owners')} />
            ) : null}
            {role === 'admin' ? (
              <AppButton label="Review properties" onPress={() => router.push('/admin-properties')} />
            ) : null}
            {role === 'admin' ? <AppButton label="Reports" onPress={() => router.push('/admin-reports')} /> : null}
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
