import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Listing = {
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

function formatRent(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Rent unavailable';
  }
  return `₹${amount.toLocaleString('en-IN')} / month`;
}

export default function FindAStayScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState(supabase ? '' : 'Supabase is not connected.');

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    void supabase
      .from('properties')
      .select('id, name, category, city, locality, monthly_rent')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else {
          setListings(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Find a Stay</AppText>
        {loading ? (
          <AppText variant="body">Loading approved stays...</AppText>
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : listings.length === 0 ? (
          <EmptyState
            title="No approved stays yet"
            message="Only properties an administrator has approved are shown here. Nothing on this screen is sample data."
          />
        ) : (
          listings.map((listing) => (
            <View key={listing.id} style={styles.card}>
              <AppText variant="body">{listing.name}</AppText>
              <AppText variant="body">
                {categoryLabel[listing.category]} · {listing.locality}, {listing.city}
              </AppText>
              <AppText variant="body">{formatRent(listing.monthly_rent)}</AppText>
            </View>
          ))
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
  card: {
    width: '100%',
    gap: Spacing.one,
    paddingBottom: Spacing.three,
  },
  error: {
    color: Brand.danger,
  },
});
