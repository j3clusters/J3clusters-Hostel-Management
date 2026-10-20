import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { bookingStatusLabel, isBookingStatus, updateBookingRequest, type BookingStatus } from '@/lib/booking-requests';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type BookingItem = {
  id: string;
  status: BookingStatus;
  propertyId: string;
  name: string;
  locality: string;
  city: string;
};

type PropertyEmbed = {
  id: string;
  name: string;
  locality: string;
  city: string;
};

export default function BookingRequestsScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [mine, setMine] = useState<BookingItem[]>([]);
  const [incoming, setIncoming] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(user ? '' : 'Sign in to see booking requests.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void Promise.all([
        supabase
          .from('booking_requests')
          .select('id, status, property_id, properties(id, name, locality, city)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        role === 'owner'
          ? supabase
              .from('booking_requests')
              .select('id, status, user_id, property_id, properties!inner(id, name, locality, city, owner_id)')
              .eq('properties.owner_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]).then(([ownResult, incomingResult]) => {
        if (!active) {
          return;
        }
        if (ownResult.error || incomingResult.error) {
          setError(ownResult.error?.message || incomingResult.error?.message || 'Booking requests could not be loaded.');
          setLoading(false);
          return;
        }

        setMine(toBookingItems(ownResult.data ?? []));
        setIncoming(toBookingItems((incomingResult.data ?? []).filter((row) => row.user_id !== user.id)));
        setError('');
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  async function changeStatus(requestId: string, status: 'confirmed' | 'rejected' | 'cancelled', list: 'mine' | 'incoming') {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const updateError = await updateBookingRequest(requestId, status);
    setBusyId(null);

    if (updateError) {
      setError(updateError);
      return;
    }

    const apply = (current: BookingItem[]) =>
      current.map((item) => (item.id === requestId ? { ...item, status } : item));
    if (list === 'mine') {
      setMine(apply);
    } else {
      setIncoming(apply);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Booking requests</AppText>
        <AppText variant="body">A request does not take payment or reserve a room.</AppText>
        {loading ? (
          <View style={styles.skeleton} />
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            <AppText variant="body" style={styles.heading}>
              Your requests
            </AppText>
            {mine.length === 0 ? (
              <EmptyState title="No booking requests" message="Open a stay and choose Request a booking." />
            ) : (
              mine.map((request) => (
                <BookingCard
                  key={request.id}
                  request={request}
                  busy={busyId === request.id}
                  onOpen={() => router.push(`/property/${request.propertyId}` as Href)}
                  onCancel={
                    request.status === 'requested'
                      ? () => void changeStatus(request.id, 'cancelled', 'mine')
                      : undefined
                  }
                />
              ))
            )}
            {role === 'owner' ? (
              <>
                <AppText variant="body" style={styles.heading}>
                  Requests for your properties
                </AppText>
                {incoming.length === 0 ? (
                  <EmptyState title="No incoming requests" message="Booking requests from residents will appear here." />
                ) : (
                  incoming.map((request) => (
                    <BookingCard
                      key={request.id}
                      request={request}
                      busy={busyId === request.id}
                      onOpen={() => router.push(`/property/${request.propertyId}` as Href)}
                      onConfirm={
                        request.status === 'requested'
                          ? () => void changeStatus(request.id, 'confirmed', 'incoming')
                          : undefined
                      }
                      onReject={
                        request.status === 'requested'
                          ? () => void changeStatus(request.id, 'rejected', 'incoming')
                          : undefined
                      }
                    />
                  ))
                )}
              </>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function toBookingItems(
  rows: {
    id: string;
    status: string;
    property_id: string;
    properties: PropertyEmbed | PropertyEmbed[] | null;
  }[],
): BookingItem[] {
  return rows.flatMap((row) => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    if (!property || !isBookingStatus(row.status)) {
      return [];
    }
    return [
      {
        id: row.id,
        status: row.status,
        propertyId: row.property_id,
        name: property.name,
        locality: property.locality,
        city: property.city,
      },
    ];
  });
}

function BookingCard({
  request,
  busy,
  onOpen,
  onConfirm,
  onReject,
  onCancel,
}: {
  request: BookingItem;
  busy: boolean;
  onOpen: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.card}>
      <StatusBadge label={bookingStatusLabel[request.status]} />
      <AppText variant="body" style={styles.name}>
        {request.name}
      </AppText>
      <AppText variant="body">
        {request.locality}, {request.city}
      </AppText>
      <AppButton label="View stay" variant="secondary" onPress={onOpen} />
      {onConfirm ? <AppButton label={busy ? 'Saving...' : 'Confirm request'} disabled={busy} onPress={onConfirm} /> : null}
      {onReject ? <AppButton label="Reject" variant="secondary" disabled={busy} onPress={onReject} /> : null}
      {onCancel ? <AppButton label="Cancel request" variant="secondary" disabled={busy} onPress={onCancel} /> : null}
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
