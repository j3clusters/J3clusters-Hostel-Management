import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { bookingStatusLabel } from '@/lib/booking-requests';
import { visitPartLabel, visitStatusLabel } from '@/lib/property-visits';
import { loadToday, type TodayItem } from '@/lib/today';
import { useAuth } from '@/providers/auth-provider';

export default function TodayScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const allowed = role === 'owner' || role === 'resident' || role === 'admin';
  const [visits, setVisits] = useState<TodayItem[]>([]);
  const [arrivals, setArrivals] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(Boolean(user && allowed));
  const [error, setError] = useState(user ? '' : 'Sign in to see today.');

  useFocusEffect(
    useCallback(() => {
      if (!user || !allowed) {
        return;
      }

      let active = true;
      void loadToday(user.id, role).then((result) => {
        if (!active) {
          return;
        }
        setVisits(result.visits);
        setArrivals(result.arrivals);
        setError(result.error);
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [allowed, role, user]),
  );

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Today</AppText>
        <AppText variant="body">{todayIntro(role)}</AppText>
        {!user ? (
          <AppText variant="body">Sign in to see today.</AppText>
        ) : !allowed ? (
          <AppText variant="body">Today is for an owner, a resident, or an administrator.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && visits.length === 0 && arrivals.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            <AppText variant="body" style={styles.heading}>
              Visits
            </AppText>
            {visits.length === 0 ? (
              <EmptyState title="No visits today" message="A visit dated for today will appear here until it is completed or cancelled." />
            ) : (
              visits.map((item) => (
                <TodayCard key={item.id} item={item} kind="visit" onOpen={() => router.push(`/property/${item.propertyId}` as Href)} />
              ))
            )}
            <AppText variant="body" style={styles.heading}>
              Arrivals
            </AppText>
            {arrivals.length === 0 ? (
              <EmptyState title="No arrivals today" message="A booking with today’s move-in date will appear here until the resident is checked in." />
            ) : (
              arrivals.map((item) => (
                <TodayCard key={item.id} item={item} kind="arrival" onOpen={() => router.push(`/property/${item.propertyId}` as Href)} />
              ))
            )}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <AppButton label="This week" variant="secondary" onPress={() => router.push('/week')} />
          </>
        )}
      </View>
    </Screen>
  );
}

function todayIntro(role: string | null) {
  if (role === 'owner') {
    return 'Visits and arrivals at your properties for today in India time. Resident names and phone numbers are not shown.';
  }
  if (role === 'admin') {
    return 'Visits and arrivals at every property for today in India time. Resident names and phone numbers are not shown.';
  }
  return 'Your visits and arrivals for today in India time. Other residents are not shown.';
}

function TodayCard({ item, kind, onOpen }: { item: TodayItem; kind: 'visit' | 'arrival'; onOpen: () => void }) {
  const statusLabel = kind === 'visit' && item.status in visitStatusLabel ? visitStatusLabel[item.status as keyof typeof visitStatusLabel] : bookingStatusLabel[item.status as keyof typeof bookingStatusLabel];

  return (
    <View style={styles.card}>
      <StatusBadge label={statusLabel} />
      <AppText variant="body" style={styles.name}>
        {item.name}
      </AppText>
      <AppText variant="body">
        {item.locality}, {item.city}
      </AppText>
      <AppText variant="body">{item.part ? visitPartLabel(item.part) : 'Time of day not set'}</AppText>
      {item.bedLabel ? <AppText variant="body">{item.bedLabel}</AppText> : null}
      <AppButton label="View stay" variant="secondary" onPress={onOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  heading: {
    color: Brand.text,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    gap: Spacing.two,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  name: {
    color: Brand.text,
    fontWeight: '800',
  },
  skeleton: {
    width: '100%',
    height: 160,
    borderRadius: Radius.card,
    backgroundColor: Brand.border,
  },
  error: {
    color: Brand.danger,
  },
});
