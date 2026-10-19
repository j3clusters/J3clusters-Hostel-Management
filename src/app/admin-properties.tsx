import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type PendingProperty = {
  id: string;
  name: string;
  category: 'pg' | 'hostel' | 'hotel' | 'guest_house';
  city: string;
  locality: string;
  monthly_rent: number | string;
};

const categoryLabel = {
  pg: 'PG',
  hostel: 'Hostel',
  hotel: 'Hotel',
  guest_house: 'Guest house',
} as const;

export default function AdminPropertiesScreen() {
  const { role } = useAuth();
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(role === 'admin');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || role !== 'admin') {
      return;
    }

    let active = true;

    void supabase
      .from('properties')
      .select('id, name, category, city, locality, monthly_rent')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else {
          setProperties(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  async function review(propertyId: string, decision: 'approved' | 'rejected') {
    if (!supabase) {
      return;
    }

    setBusyId(propertyId);
    setError('');
    const { error: reviewError } = await supabase.rpc('review_property', {
      property_id: propertyId,
      decision,
    });
    setBusyId(null);

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    setProperties((current) => current.filter((item) => item.id !== propertyId));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Property reviews</AppText>
        {role !== 'admin' ? (
          <AppText variant="body">Only an administrator can approve properties.</AppText>
        ) : loading ? (
          <AppText variant="body">Loading properties...</AppText>
        ) : properties.length === 0 ? (
          <EmptyState title="No properties waiting" message="Owner submissions will appear here." />
        ) : (
          properties.map((item) => (
            <View key={item.id} style={styles.card}>
              <AppText variant="body">{item.name}</AppText>
              <AppText variant="body">
                {categoryLabel[item.category]} · {item.locality}, {item.city}
              </AppText>
              <AppText variant="body">₹{Number(item.monthly_rent).toLocaleString('en-IN')} / month</AppText>
              <AppButton
                label={busyId === item.id ? 'Saving...' : 'Approve'}
                disabled={busyId !== null}
                onPress={() => void review(item.id, 'approved')}
              />
              <AppButton
                label="Reject"
                variant="secondary"
                disabled={busyId !== null}
                onPress={() => void review(item.id, 'rejected')}
              />
            </View>
          ))
        )}
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
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
  card: {
    width: '100%',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  error: {
    color: Brand.danger,
  },
});
