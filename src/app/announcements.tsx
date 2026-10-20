import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { announcementDateLabel, postAnnouncement, removeAnnouncement, type AnnouncementItem } from '@/lib/announcements';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type OwnedProperty = {
  id: string;
  name: string;
};

export default function AnnouncementsScreen() {
  const { user, role } = useAuth();
  const canUse = role === 'owner' || role === 'resident';
  const [properties, setProperties] = useState<OwnedProperty[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(canUse);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(!user ? 'Sign in to read notices.' : canUse ? '' : 'Notices are for residents and owners.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || !canUse) {
        return;
      }

      let active = true;
      const announcementsQuery = supabase
        .from('announcements')
        .select('id, property_id, message, created_at, properties(name)')
        .order('created_at', { ascending: false });
      const propertiesQuery =
        role === 'owner'
          ? supabase.from('properties').select('id, name').order('name')
          : Promise.resolve({ data: [], error: null });

      void Promise.all([propertiesQuery, announcementsQuery]).then(([propertyResult, announcementResult]) => {
        if (!active) {
          return;
        }
        if (propertyResult.error || announcementResult.error) {
          setError(propertyResult.error?.message || announcementResult.error?.message || 'Notices could not be loaded.');
          setLoading(false);
          return;
        }

        const nextProperties = (propertyResult.data ?? []).flatMap((row) =>
          typeof row.id === 'string' && typeof row.name === 'string' ? [{ id: row.id, name: row.name }] : [],
        );
        setProperties(nextProperties);
        setPropertyId((current) => (current && nextProperties.some((property) => property.id === current) ? current : nextProperties[0]?.id ?? null));
        setAnnouncements(
          (announcementResult.data ?? []).flatMap((row) => {
            const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
            if (
              typeof row.id !== 'string' ||
              typeof row.property_id !== 'string' ||
              typeof row.message !== 'string' ||
              typeof row.created_at !== 'string' ||
              !property ||
              typeof property.name !== 'string'
            ) {
              return [];
            }
            return [
              {
                id: row.id,
                propertyId: row.property_id,
                propertyName: property.name,
                message: row.message,
                postedAt: row.created_at,
              },
            ];
          }),
        );
        setError('');
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [canUse, role, user]),
  );

  async function publish() {
    if (saving || !propertyId) {
      return;
    }

    const propertyName = properties.find((property) => property.id === propertyId)?.name ?? '';
    setSaving(true);
    setError('');
    const result = await postAnnouncement(propertyId, propertyName, message);
    setSaving(false);

    if (result.error || !result.announcement) {
      setError(result.error || 'The notice could not be posted.');
      return;
    }

    setAnnouncements((current) => [result.announcement as AnnouncementItem, ...current]);
    setMessage('');
  }

  async function remove(announcementId: string) {
    if (busyId) {
      return;
    }

    setBusyId(announcementId);
    setError('');
    const removeError = await removeAnnouncement(announcementId);
    setBusyId(null);

    if (removeError) {
      setError(removeError);
      return;
    }

    setAnnouncements((current) => current.filter((item) => item.id !== announcementId));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Notices</AppText>
        <AppText variant="body">
          An owner can post a notice for a property. Confirmed and checked-in residents can read it. This does not send a phone notification.
        </AppText>
        {!canUse ? (
          <AppText variant="body">{error}</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && properties.length === 0 && announcements.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            {role === 'owner' ? (
              properties.length === 0 ? (
                <EmptyState title="No properties yet" message="Add a property first, then come back to post a notice." />
              ) : (
                <>
                  <AppText variant="body">Property</AppText>
                  <View style={styles.choices}>
                    {properties.map((property) => (
                      <Pressable
                        key={property.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: propertyId === property.id }}
                        onPress={() => setPropertyId(property.id)}
                        style={[styles.choice, propertyId === property.id && styles.choiceSelected]}>
                        <AppText variant="body" style={propertyId === property.id ? styles.choiceSelectedLabel : styles.choiceLabel}>
                          {property.name}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <AppTextField label="Notice" value={message} onChangeText={setMessage} autoCapitalize="sentences" multiline />
                  <AppButton label={saving ? 'Posting...' : 'Post notice'} disabled={saving} onPress={() => void publish()} />
                </>
              )
            ) : null}
            {announcements.length === 0 && !(role === 'owner' && properties.length === 0) ? (
              <EmptyState
                title="No notices"
                message={role === 'owner' ? 'Notices you post will appear here.' : 'Notices for your stay will appear here.'}
              />
            ) : (
              announcements.map((item) => (
                <View key={item.id} style={styles.card}>
                  <AppText variant="body" style={styles.name}>
                    {item.propertyName}
                  </AppText>
                  <AppText variant="body">{item.message}</AppText>
                  <AppText variant="body">{announcementDateLabel(item.postedAt)}</AppText>
                  {role === 'owner' ? (
                    <AppButton
                      label={busyId === item.id ? 'Removing...' : 'Remove notice'}
                      variant="secondary"
                      disabled={busyId !== null}
                      onPress={() => void remove(item.id)}
                    />
                  ) : null}
                </View>
              ))
            )}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
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
  choices: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.white,
  },
  choiceSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  choiceLabel: {
    color: Brand.text,
    fontWeight: '700',
  },
  choiceSelectedLabel: {
    color: Brand.white,
    fontWeight: '700',
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
