import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type PendingRequest = {
  id: string;
  full_name: string;
  phone: string;
  business_name: string;
  city: string;
};

export default function AdminOwnersScreen() {
  const { role } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(role === 'admin');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || role !== 'admin') {
      return;
    }

    let active = true;

    void supabase
      .from('owner_verifications')
      .select('id, full_name, phone, business_name, city')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else {
          setRequests(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  async function review(requestId: string, decision: 'approved' | 'rejected') {
    if (!supabase) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const { error: reviewError } = await supabase.rpc('review_owner_request', {
      request_id: requestId,
      decision,
    });
    setBusyId(null);

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    setRequests((current) => current.filter((item) => item.id !== requestId));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Owner requests</AppText>
        {role !== 'admin' ? (
          <AppText variant="body">Only an administrator can review owner requests.</AppText>
        ) : loading ? (
          <AppText variant="body">Loading requests...</AppText>
        ) : requests.length === 0 ? (
          <EmptyState title="No requests waiting" message="New owner requests will appear here." />
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.card}>
              <AppText variant="body">
                {item.business_name} in {item.city}
              </AppText>
              <AppText variant="body">
                {item.full_name}, {item.phone}
              </AppText>
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
