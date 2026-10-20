import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { isVisitStatus, updateVisit, visitStatusLabel, type VisitStatus } from '@/lib/property-visits';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type VisitItem = {
  id: string;
  status: VisitStatus;
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

export default function VisitListScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [mine, setMine] = useState<VisitItem[]>([]);
  const [incoming, setIncoming] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(user ? '' : 'Sign in to see visit requests.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;

      void Promise.all([
        supabase
          .from('property_visits')
          .select('id, status, property_id, properties(id, name, locality, city)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        role === 'owner'
          ? supabase
              .from('property_visits')
              .select('id, status, user_id, property_id, properties!inner(id, name, locality, city, owner_id)')
              .eq('properties.owner_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]).then(([ownResult, incomingResult]) => {
        if (!active) {
          return;
        }
        if (ownResult.error || incomingResult.error) {
          setError(ownResult.error?.message || incomingResult.error?.message || 'Visit requests could not be loaded.');
          setLoading(false);
          return;
        }

        setMine(toVisitItems(ownResult.data ?? []));
        setIncoming(
          toVisitItems(incomingResult.data ?? []).filter((item) => {
            const row = (incomingResult.data ?? []).find((entry) => entry.id === item.id);
            return row?.user_id !== user.id;
          }),
        );
        setError('');
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  async function changeStatus(visitId: string, status: 'confirmed' | 'completed' | 'cancelled', list: 'mine' | 'incoming') {
    if (busyId) {
      return;
    }

    setBusyId(visitId);
    setError('');
    const updateError = await updateVisit(visitId, status);
    setBusyId(null);

    if (updateError) {
      setError(updateError);
      return;
    }

    const apply = (current: VisitItem[]) =>
      current.map((item) => (item.id === visitId ? { ...item, status } : item));
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
        <AppText variant="title">Visit list</AppText>
        <AppText variant="body">A visit request is not a booking or a saved stay.</AppText>
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
              <EmptyState title="No visit requests" message="Open a stay and choose Request a visit." />
            ) : (
              mine.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  busy={busyId === visit.id}
                  onOpen={() => router.push(`/property/${visit.propertyId}` as Href)}
                  onCancel={
                    visit.status === 'requested' ? () => void changeStatus(visit.id, 'cancelled', 'mine') : undefined
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
                  <EmptyState title="No incoming requests" message="Requests from residents will appear here." />
                ) : (
                  incoming.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      busy={busyId === visit.id}
                      onOpen={() => router.push(`/property/${visit.propertyId}` as Href)}
                      onConfirm={
                        visit.status === 'requested'
                          ? () => void changeStatus(visit.id, 'confirmed', 'incoming')
                          : undefined
                      }
                      onComplete={
                        visit.status === 'confirmed'
                          ? () => void changeStatus(visit.id, 'completed', 'incoming')
                          : undefined
                      }
                      onCancel={
                        visit.status === 'requested' || visit.status === 'confirmed'
                          ? () => void changeStatus(visit.id, 'cancelled', 'incoming')
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

function toVisitItems(
  rows: {
    id: string;
    status: string;
    property_id: string;
    properties: PropertyEmbed | PropertyEmbed[] | null;
  }[],
) {
  return rows.flatMap((row) => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    if (!property || !isVisitStatus(row.status)) {
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

function VisitCard({
  visit,
  busy,
  onOpen,
  onConfirm,
  onComplete,
  onCancel,
}: {
  visit: VisitItem;
  busy: boolean;
  onOpen: () => void;
  onConfirm?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.card}>
      <StatusBadge label={visitStatusLabel[visit.status]} />
      <AppText variant="body" style={styles.name}>
        {visit.name}
      </AppText>
      <AppText variant="body">
        {visit.locality}, {visit.city}
      </AppText>
      <AppButton label="View stay" variant="secondary" onPress={onOpen} />
      {onConfirm ? <AppButton label={busy ? 'Saving...' : 'Confirm visit'} disabled={busy} onPress={onConfirm} /> : null}
      {onComplete ? (
        <AppButton label={busy ? 'Saving...' : 'Mark completed'} disabled={busy} onPress={onComplete} />
      ) : null}
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
