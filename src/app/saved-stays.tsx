import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PropertyCard, type PropertyCardData } from '@/components/property-card';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { isPropertyCategory } from '@/constants/property';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { removeSavedStay } from '@/lib/saved-stays';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type SavedStay = PropertyCardData & {
  savedId: string;
};

export default function SavedStaysScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stays, setStays] = useState<SavedStay[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState(user ? '' : 'Sign in to see saved stays.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void supabase
        .from('saved_properties')
        .select('id, property_id, properties(id, name, category, city, locality, monthly_rent, cover_path)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error: loadError }) => {
          if (!active) {
            return;
          }
          if (loadError) {
            setError(loadError.message);
            setLoading(false);
            return;
          }

          const nextStays = (data ?? []).flatMap((row) => {
            const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
            if (!property || !isPropertyCategory(property.category)) {
              return [];
            }
            return [
              {
                savedId: row.id,
                id: property.id,
                name: property.name,
                category: property.category,
                city: property.city,
                locality: property.locality,
                monthly_rent: property.monthly_rent,
                cover_path: property.cover_path,
              },
            ];
          });
          setError('');
          setStays(nextStays);
          setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  async function removeStay(stay: SavedStay) {
    if (!user || removingId) {
      return;
    }

    setRemovingId(stay.id);
    setError('');
    const removeError = await removeSavedStay(user.id, stay.id);
    setRemovingId(null);

    if (removeError) {
      setError(removeError);
      return;
    }

    setStays((current) => current.filter((item) => item.id !== stay.id));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Saved stays</AppText>
        <AppText variant="body">Saving a stay keeps it here. It is not a booking.</AppText>
        {loading ? (
          <View style={styles.skeleton} />
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : stays.length === 0 ? (
          <EmptyState title="No saved stays" message="Tap the heart on a stay to keep it here." />
        ) : (
          stays.map((stay) => (
            <PropertyCard
              key={stay.savedId}
              listing={stay}
              saved
              saving={removingId === stay.id}
              onPress={() => router.push(`/property/${stay.id}` as Href)}
              onSavePress={() => void removeStay(stay)}
            />
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
  skeleton: {
    width: '100%',
    height: 220,
    borderRadius: Radius.card,
    backgroundColor: Brand.border,
  },
  error: {
    color: Brand.danger,
  },
});
