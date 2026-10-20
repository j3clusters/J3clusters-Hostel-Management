import { Pressable, StyleSheet, View } from 'react-native';

import { PropertyPhotoPlaceholder } from '@/components/property-photo-placeholder';
import { AppText } from '@/components/ui/app-text';
import { StatusBadge } from '@/components/ui/status-badge';
import { categoryLabel, formatMonthlyRent, type PropertyCategory } from '@/constants/property';
import { Brand, Radius, Spacing } from '@/constants/theme';

export type PropertyCardData = {
  id: string;
  name: string;
  category: PropertyCategory;
  city: string;
  locality: string;
  monthly_rent: number | string;
};

type Props = {
  listing: PropertyCardData;
  onPress: () => void;
};

export function PropertyCard({ listing, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View details for ${listing.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <PropertyPhotoPlaceholder label={listing.name} />
      <View style={styles.body}>
        <StatusBadge label={categoryLabel[listing.category]} />
        <AppText variant="body" style={styles.name}>
          {listing.name}
        </AppText>
        <AppText variant="body">
          {listing.locality}, {listing.city}
        </AppText>
        <AppText variant="body" style={styles.price}>
          {formatMonthlyRent(listing.monthly_rent)}
        </AppText>
        <AppText variant="body" style={styles.action}>
          View details
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  body: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  name: {
    color: Brand.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  price: {
    color: Brand.text,
    fontWeight: '700',
  },
  action: {
    color: Brand.primary,
    fontWeight: '700',
  },
});
