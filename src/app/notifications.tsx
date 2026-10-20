import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { isNotificationScreen, markNotificationRead, notificationDateLabel, type NotificationItem } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const canUse = role === 'owner' || role === 'resident';
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(canUse);
  const [error, setError] = useState(!user ? 'Sign in to see notifications.' : canUse ? '' : 'Notifications are for residents and owners.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || !canUse) {
        return;
      }

      let active = true;
      void supabase
        .from('notifications')
        .select('id, title, body, screen, read_at, created_at')
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
          setItems(
            (data ?? []).flatMap((row) => {
              if (
                typeof row.id !== 'string' ||
                typeof row.title !== 'string' ||
                typeof row.body !== 'string' ||
                typeof row.created_at !== 'string' ||
                !isNotificationScreen(row.screen)
              ) {
                return [];
              }
              return [
                {
                  id: row.id,
                  title: row.title,
                  body: row.body,
                  screen: row.screen,
                  readAt: typeof row.read_at === 'string' ? row.read_at : null,
                  createdAt: row.created_at,
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
    }, [canUse, user]),
  );

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      const readError = await markNotificationRead(item.id);
      if (readError) {
        setError(readError);
        return;
      }
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)));
    }
    router.push(`/${item.screen}` as Href);
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Notifications</AppText>
        <AppText variant="body">Booking updates, visits, leave, maintenance, and notices show up here. This does not alert your phone.</AppText>
        {!canUse ? (
          <AppText variant="body">{error}</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && items.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : items.length === 0 ? (
          <EmptyState title="No notifications" message="A booking update, notice, leave request, or maintenance update will appear here." />
        ) : (
          <>
            {items.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => void openItem(item)} style={styles.card}>
                {item.readAt ? null : <StatusBadge label="New" />}
                <AppText variant="body" style={styles.name}>
                  {item.title}
                </AppText>
                <AppText variant="body">{item.body}</AppText>
                <AppText variant="body">{notificationDateLabel(item.createdAt)}</AppText>
              </Pressable>
            ))}
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
