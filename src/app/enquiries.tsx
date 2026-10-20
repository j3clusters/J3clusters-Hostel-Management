import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { closeEnquiry, replyToEnquiry } from '@/lib/enquiries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type EnquiryItem = {
  id: string;
  message: string;
  ownerReply: string | null;
  status: 'open' | 'closed';
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

export default function EnquiriesScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [mine, setMine] = useState<EnquiryItem[]>([]);
  const [incoming, setIncoming] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'close' | 'reply' | null>(null);
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [error, setError] = useState(user ? '' : 'Sign in to see enquiries.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void Promise.all([
        supabase
          .from('enquiries')
          .select('id, message, owner_reply, status, property_id, properties(id, name, locality, city)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        role === 'owner'
          ? supabase
              .from('enquiries')
              .select('id, message, owner_reply, status, user_id, property_id, properties!inner(id, name, locality, city, owner_id)')
              .eq('properties.owner_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]).then(([ownResult, incomingResult]) => {
        if (!active) {
          return;
        }
        if (ownResult.error || incomingResult.error) {
          setError(ownResult.error?.message || incomingResult.error?.message || 'Enquiries could not be loaded.');
          setLoading(false);
          return;
        }

        setMine(toEnquiryItems(ownResult.data ?? []));
        setIncoming(toEnquiryItems((incomingResult.data ?? []).filter((row) => row.user_id !== user.id)));
        setError('');
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  async function close(enquiryId: string, list: 'mine' | 'incoming') {
    if (busyId) {
      return;
    }

    setBusyId(enquiryId);
    setBusyAction('close');
    setError('');
    const closeError = await closeEnquiry(enquiryId);
    setBusyId(null);
    setBusyAction(null);

    if (closeError) {
      setError(closeError);
      return;
    }

    const apply = (current: EnquiryItem[]) =>
      current.map((item) => (item.id === enquiryId ? { ...item, status: 'closed' as const } : item));
    if (list === 'mine') {
      setMine(apply);
    } else {
      setIncoming(apply);
    }
  }

  async function saveReply(enquiryId: string) {
    if (busyId) {
      return;
    }

    setBusyId(enquiryId);
    setBusyAction('reply');
    setError('');
    const replyError = await replyToEnquiry(enquiryId, replyById[enquiryId] ?? '');
    setBusyId(null);
    setBusyAction(null);

    if (replyError) {
      setError(replyError);
      return;
    }

    const reply = (replyById[enquiryId] ?? '').trim();
    setIncoming((current) => current.map((item) => (item.id === enquiryId ? { ...item, ownerReply: reply } : item)));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Enquiries</AppText>
        <AppText variant="body">An enquiry is not a booking, a visit, or a saved stay. The owner can reply once while it is open.</AppText>
        {loading ? (
          <View style={styles.skeleton} />
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            <AppText variant="body" style={styles.heading}>
              Your enquiries
            </AppText>
            {mine.length === 0 ? (
              <EmptyState title="No enquiries" message="Open a stay and send an enquiry." />
            ) : (
              mine.map((enquiry) => (
                <EnquiryCard
                  key={enquiry.id}
                  enquiry={enquiry}
                  busy={busyId === enquiry.id}
                  closing={busyId === enquiry.id && busyAction === 'close'}
                  onOpen={() => router.push(`/property/${enquiry.propertyId}` as Href)}
                  onClose={enquiry.status === 'open' ? () => void close(enquiry.id, 'mine') : undefined}
                />
              ))
            )}
            {role === 'owner' ? (
              <>
                <AppText variant="body" style={styles.heading}>
                  Enquiries for your properties
                </AppText>
                {incoming.length === 0 ? (
                  <EmptyState title="No incoming enquiries" message="Messages from residents will appear here." />
                ) : (
                  incoming.map((enquiry) => (
                    <EnquiryCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      busy={busyId === enquiry.id}
                      closing={busyId === enquiry.id && busyAction === 'close'}
                      onOpen={() => router.push(`/property/${enquiry.propertyId}` as Href)}
                      onClose={enquiry.status === 'open' ? () => void close(enquiry.id, 'incoming') : undefined}
                      reply={replyById[enquiry.id] ?? ''}
                      onReplyChange={
                        enquiry.status === 'open' && !enquiry.ownerReply
                          ? (value) => setReplyById((current) => ({ ...current, [enquiry.id]: value }))
                          : undefined
                      }
                      onSaveReply={
                        enquiry.status === 'open' && !enquiry.ownerReply ? () => void saveReply(enquiry.id) : undefined
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

function toEnquiryItems(
  rows: {
    id: string;
    message: string;
    owner_reply?: string | null;
    status: string;
    property_id: string;
    properties: PropertyEmbed | PropertyEmbed[] | null;
  }[],
): EnquiryItem[] {
  return rows.flatMap((row) => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    if (!property || (row.status !== 'open' && row.status !== 'closed')) {
      return [];
    }
    return [
      {
        id: row.id,
        message: row.message,
        ownerReply: typeof row.owner_reply === 'string' ? row.owner_reply : null,
        status: row.status,
        propertyId: row.property_id,
        name: property.name,
        locality: property.locality,
        city: property.city,
      },
    ];
  });
}

function EnquiryCard({
  enquiry,
  busy,
  closing,
  onOpen,
  onClose,
  reply,
  onReplyChange,
  onSaveReply,
}: {
  enquiry: EnquiryItem;
  busy: boolean;
  closing?: boolean;
  onOpen: () => void;
  onClose?: () => void;
  reply?: string;
  onReplyChange?: (value: string) => void;
  onSaveReply?: () => void;
}) {
  return (
    <View style={styles.card}>
      <StatusBadge label={enquiry.status === 'open' ? 'Open' : 'Closed'} />
      <AppText variant="body" style={styles.name}>
        {enquiry.name}
      </AppText>
      <AppText variant="body">
        {enquiry.locality}, {enquiry.city}
      </AppText>
      <AppText variant="body">{enquiry.message}</AppText>
      {enquiry.ownerReply ? (
        <>
          <AppText variant="body" style={styles.name}>
            Owner reply
          </AppText>
          <AppText variant="body">{enquiry.ownerReply}</AppText>
        </>
      ) : null}
      {onSaveReply && onReplyChange ? (
        <>
          <AppTextField label="Reply" value={reply ?? ''} onChangeText={onReplyChange} autoCapitalize="sentences" multiline />
          <AppButton label={busy && !closing ? 'Saving...' : 'Save reply'} disabled={busy} onPress={onSaveReply} />
        </>
      ) : null}
      <AppButton label="View stay" variant="secondary" onPress={onOpen} />
      {onClose ? <AppButton label={closing ? 'Closing...' : 'Close enquiry'} disabled={busy} onPress={onClose} /> : null}
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
