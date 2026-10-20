import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { categoryLabel, formatMonthlyRent, isPropertyCategory } from '@/constants/property';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type PropertyDetails = {
  name: string;
  category: string;
  city: string;
  locality: string;
  address: string | null;
  description: string | null;
  monthly_rent: number | string;
};

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = Array.isArray(id) ? id[0] : id;
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase && propertyId));
  const [error, setError] = useState(propertyId ? '' : 'This stay could not be opened.');

  useEffect(() => {
    if (!supabase || !propertyId) {
      return;
    }

    let active = true;

    void supabase
      .from('properties')
      .select('name, category, city, locality, address, description, monthly_rent')
      .eq('id', propertyId)
      .eq('status', 'approved')
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else if (!data || !isPropertyCategory(data.category)) {
          setError('This stay is not available.');
        } else {
          setProperty(data);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {loading ? (
          <AppText variant="body">Loading stay...</AppText>
        ) : error || !property || !isPropertyCategory(property.category) ? (
          <AppText style={styles.error}>{error || 'This stay is not available.'}</AppText>
        ) : (
          <>
            <AppText variant="eyebrow">{categoryLabel[property.category]}</AppText>
            <AppText variant="title">{property.name}</AppText>
            <AppText variant="body">
              {property.locality}, {property.city}
            </AppText>
            {property.address ? <AppText variant="body">{property.address}</AppText> : null}
            <AppText variant="body">{formatMonthlyRent(property.monthly_rent)}</AppText>
            {property.description ? <AppText variant="body">{property.description}</AppText> : null}
            <StatusBadge label="Enquiry not available yet" />
          </>
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
  error: {
    color: Brand.danger,
  },
});
