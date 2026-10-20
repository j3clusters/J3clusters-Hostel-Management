import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PropertyCover } from '@/components/property-cover';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { categoryLabel, formatMonthlyRent, isPropertyCategory, type PropertyCategory } from '@/constants/property';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { uploadPropertyCover } from '@/lib/property-photos';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type OwnedProperty = {
  id: string;
  name: string;
  category: PropertyCategory;
  city: string;
  locality: string;
  monthly_rent: number | string;
  status: 'pending' | 'approved' | 'rejected';
  cover_path: string | null;
};

const statusLabel = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export default function MyPropertiesScreen() {
  const { user, role } = useAuth();
  const [properties, setProperties] = useState<OwnedProperty[]>([]);
  const [loading, setLoading] = useState(role === 'owner');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState<Record<string, number>>({});
  const [error, setError] = useState(role === 'owner' ? '' : 'Only an owner can manage property photos.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || role !== 'owner') {
        return;
      }

      let active = true;
      void supabase
        .from('properties')
        .select('id, name, category, city, locality, monthly_rent, status, cover_path')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error: loadError }) => {
          if (!active) {
            return;
          }
          if (loadError) {
            setError(loadError.message);
          } else {
            setError('');
            setProperties(
              (data ?? []).flatMap((item) => {
                if (!isPropertyCategory(item.category) || !isStatus(item.status)) {
                  return [];
                }
                return [{ ...item, category: item.category, status: item.status }];
              }),
            );
          }
          setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  async function changeCover(propertyId: string) {
    if (uploadingId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    setUploadingId(propertyId);
    setError('');
    const uploadError = await uploadPropertyCover(
      propertyId,
      result.assets[0].uri,
      result.assets[0].mimeType ?? 'image/jpeg',
    );
    setUploadingId(null);

    if (uploadError) {
      setError(uploadError);
      return;
    }

    setProperties((current) =>
      current.map((item) => (item.id === propertyId ? { ...item, cover_path: `${propertyId}/cover` } : item)),
    );
    setPhotoVersion((current) => ({ ...current, [propertyId]: (current[propertyId] ?? 0) + 1 }));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">My properties</AppText>
        <AppText variant="body">Add or replace a cover photo. Visitors see it only after approval.</AppText>
        {role !== 'owner' ? (
          <AppText variant="body">Only an owner can manage property photos.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && properties.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : properties.length === 0 ? (
          <EmptyState title="No properties yet" message="Add a property first, then come back to add its photo." />
        ) : (
          properties.map((property) => (
            <View key={property.id} style={styles.card}>
              <PropertyCover
                key={`${property.cover_path ?? 'none'}-${photoVersion[property.id] ?? 0}`}
                label={property.name}
                coverPath={property.cover_path}
              />
              <View style={styles.body}>
                <StatusBadge label={statusLabel[property.status]} />
                <AppText variant="body" style={styles.name}>
                  {property.name}
                </AppText>
                <AppText variant="body">
                  {categoryLabel[property.category]} · {property.locality}, {property.city}
                </AppText>
                <AppText variant="body">{formatMonthlyRent(property.monthly_rent)}</AppText>
                <AppButton
                  label={uploadingId === property.id ? 'Uploading...' : property.cover_path ? 'Change photo' : 'Add photo'}
                  disabled={uploadingId !== null}
                  onPress={() => void changeCover(property.id)}
                />
              </View>
            </View>
          ))
        )}
        {error && properties.length > 0 ? <AppText style={styles.error}>{error}</AppText> : null}
      </View>
    </Screen>
  );
}

function isStatus(value: string): value is OwnedProperty['status'] {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  card: {
    width: '100%',
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  body: {
    width: '100%',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  name: {
    color: Brand.text,
    fontWeight: '800',
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
