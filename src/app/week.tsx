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
import { leaveDateLabel } from '@/lib/leave-requests';
import { visitPartLabel, visitStatusLabel } from '@/lib/property-visits';
import { loadWeek, type WeekDay, type WeekItem } from '@/lib/week';
import { useAuth } from '@/providers/auth-provider';

export default function WeekScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const allowed = role === 'owner' || role === 'resident' || role === 'admin';
  const [days, setDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(Boolean(user && allowed));
  const [error, setError] = useState(user ? '' : 'Sign in to see this week.');

  useFocusEffect(
    useCallback(() => {
      if (!user || !allowed) {
        return;
      }

      let active = true;
      void loadWeek(user.id, role).then((result) => {
        if (!active) {
          return;
        }
        setDays(result.days);
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
        <AppText variant="title">This week</AppText>
        <AppText variant="body">{weekIntro(role)}</AppText>
        {!user ? (
          <AppText variant="body">Sign in to see this week.</AppText>
        ) : !allowed ? (
          <AppText variant="body">This week is for an owner, a resident, or an administrator.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && days.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : days.length === 0 ? (
          <EmptyState illustration="activity" title="Nothing this week" message="A visit or move-in in the next 7 days will appear here until it is completed or the resident is checked in." />
        ) : (
          <>
            {days.map((day) => (
              <View key={day.date} style={styles.day}>
                <AppText variant="body" style={styles.heading}>
                  {leaveDateLabel(day.date)}
                </AppText>
                {day.items.map((item) => (
                  <WeekCard key={`${item.kind}-${item.id}`} item={item} onOpen={() => router.push(`/property/${item.propertyId}` as Href)} />
                ))}
              </View>
            ))}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function weekIntro(role: string | null) {
  if (role === 'owner') {
    return 'Visits and arrivals at your properties for the next 7 days in India time, including today. Resident names and phone numbers are not shown.';
  }
  if (role === 'admin') {
    return 'Visits and arrivals at every property for the next 7 days in India time, including today. Resident names and phone numbers are not shown.';
  }
  return 'Your visits and arrivals for the next 7 days in India time, including today. Other residents are not shown.';
}

function WeekCard({ item, onOpen }: { item: WeekItem; onOpen: () => void }) {
  const statusLabel =
    item.kind === 'visit' && item.status in visitStatusLabel
      ? visitStatusLabel[item.status as keyof typeof visitStatusLabel]
      : bookingStatusLabel[item.status as keyof typeof bookingStatusLabel];

  return (
    <View style={styles.card}>
      <StatusBadge label={statusLabel} />
      <AppText variant="body" style={styles.name}>
        {item.kind === 'visit' ? 'Visit' : 'Arrival'} · {item.name}
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
  day: {
    width: '100%',
    gap: Spacing.two,
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
