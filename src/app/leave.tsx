import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  addIsoDays,
  isLeaveStatus,
  kolkataToday,
  leaveDateChoices,
  leaveRangeLabel,
  leaveStatusText,
  requestLeave,
  reviewLeave,
  type LeaveItem,
} from '@/lib/leave-requests';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type StayOption = {
  bookingId: string;
  propertyName: string;
  bedLabel: string | null;
};

const today = kolkataToday();

export default function LeaveScreen() {
  const { user, role } = useAuth();
  const canUse = role === 'owner' || role === 'resident';
  const [stays, setStays] = useState<StayOption[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(canUse);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(!user ? 'Sign in to request leave.' : canUse ? '' : 'Leave requests are for residents and owners.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || !canUse) {
        return;
      }

      let active = true;
      const leavesQuery = supabase
        .from('leave_requests')
        .select('id, starts_on, ends_on, note, status, properties(name), booking_requests(beds(label, rooms(name)))')
        .order('created_at', { ascending: false });
      const staysQuery =
        role === 'resident'
          ? supabase
              .from('booking_requests')
              .select('id, properties(name), beds(label, rooms(name))')
              .eq('user_id', user.id)
              .eq('status', 'checked_in')
          : Promise.resolve({ data: [], error: null });

      void Promise.all([staysQuery, leavesQuery]).then(([stayResult, leaveResult]) => {
        if (!active) {
          return;
        }
        if (stayResult.error || leaveResult.error) {
          setError(stayResult.error?.message || leaveResult.error?.message || 'Leave requests could not be loaded.');
          setLoading(false);
          return;
        }

        const nextStays = (stayResult.data ?? []).flatMap((row) => {
          const propertyName = readName(row.properties);
          if (typeof row.id !== 'string' || !propertyName) {
            return [];
          }
          return [{ bookingId: row.id, propertyName, bedLabel: readBedLabel(row.beds) }];
        });
        setStays(nextStays);
        setBookingId((current) => (current && nextStays.some((stay) => stay.bookingId === current) ? current : nextStays[0]?.bookingId ?? null));
        setLeaves(
          (leaveResult.data ?? []).flatMap((row) => {
            const propertyName = readName(row.properties);
            if (
              typeof row.id !== 'string' ||
              typeof row.starts_on !== 'string' ||
              typeof row.ends_on !== 'string' ||
              typeof row.note !== 'string' ||
              !isLeaveStatus(row.status) ||
              !propertyName
            ) {
              return [];
            }
            return [
              {
                id: row.id,
                propertyName,
                bedLabel: readNestedBedLabel(row.booking_requests),
                startsOn: row.starts_on,
                endsOn: row.ends_on,
                note: row.note,
                status: row.status,
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

  async function sendLeave() {
    if (saving || !bookingId) {
      return;
    }

    const stay = stays.find((item) => item.bookingId === bookingId);
    if (!stay) {
      return;
    }

    setSaving(true);
    setError('');
    const result = await requestLeave(stay.bookingId, startsOn, endsOn, note, stay.propertyName, stay.bedLabel);
    setSaving(false);

    if (result.error || !result.leave) {
      setError(result.error || 'The leave request could not be saved.');
      return;
    }

    setLeaves((current) => [result.leave as LeaveItem, ...current]);
    setNote('');
  }

  async function decide(leaveId: string, decision: 'approved' | 'declined') {
    if (busyId) {
      return;
    }

    setBusyId(leaveId);
    setError('');
    const reviewError = await reviewLeave(leaveId, decision);
    setBusyId(null);

    if (reviewError) {
      setError(reviewError);
      return;
    }

    setLeaves((current) => current.map((leave) => (leave.id === leaveId ? { ...leave, status: decision } : leave)));
  }

  const startChoices = leaveDateChoices(today, 14);
  const endChoices = leaveDateChoices(startsOn, 14);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Leave</AppText>
        <AppText variant="body">
          A checked-in resident can request leave. The bed stays held. The owner approves or declines it. This does not take payment.
        </AppText>
        {!canUse ? (
          <AppText variant="body">{error}</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && stays.length === 0 && leaves.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            {role === 'resident' ? (
              stays.length === 0 ? (
                <EmptyState title="No checked-in stay" message="Check in before requesting leave." />
              ) : (
                <>
                  <AppText variant="body">Stay</AppText>
                  <View style={styles.choices}>
                    {stays.map((stay) => (
                      <Pressable
                        key={stay.bookingId}
                        accessibilityRole="button"
                        accessibilityState={{ selected: bookingId === stay.bookingId }}
                        onPress={() => setBookingId(stay.bookingId)}
                        style={[styles.choice, bookingId === stay.bookingId && styles.choiceSelected]}>
                        <AppText variant="body" style={bookingId === stay.bookingId ? styles.choiceSelectedLabel : styles.choiceLabel}>
                          {stay.propertyName}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <AppText variant="body">From</AppText>
                  <View style={styles.choices}>
                    {startChoices.map((item) => (
                      <Pressable
                        key={item.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: startsOn === item.value }}
                        onPress={() => {
                          const latest = addIsoDays(item.value, 13);
                          setStartsOn(item.value);
                          setEndsOn((current) => {
                            if (current < item.value) {
                              return item.value;
                            }
                            if (current > latest) {
                              return latest;
                            }
                            return current;
                          });
                        }}
                        style={[styles.choice, startsOn === item.value && styles.choiceSelected]}>
                        <AppText variant="body" style={startsOn === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                          {item.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <AppText variant="body">Until</AppText>
                  <View style={styles.choices}>
                    {endChoices.map((item) => (
                      <Pressable
                        key={item.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: endsOn === item.value }}
                        onPress={() => setEndsOn(item.value)}
                        style={[styles.choice, endsOn === item.value && styles.choiceSelected]}>
                        <AppText variant="body" style={endsOn === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                          {item.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <AppTextField label="Reason for leave" value={note} onChangeText={setNote} autoCapitalize="sentences" multiline />
                  <AppButton label={saving ? 'Sending...' : 'Request leave'} disabled={saving} onPress={() => void sendLeave()} />
                </>
              )
            ) : null}
            {leaves.length === 0 && !(role === 'resident' && stays.length === 0) ? (
              <EmptyState
                title="No leave requests"
                message={role === 'owner' ? 'Leave requests from checked-in residents will appear here.' : 'Your leave requests will appear here.'}
              />
            ) : (
              leaves.map((leave) => (
                <View key={leave.id} style={styles.card}>
                  <StatusBadge label={leaveStatusText(leave.status)} />
                  <AppText variant="body" style={styles.name}>
                    {leaveRangeLabel(leave.startsOn, leave.endsOn)}
                  </AppText>
                  <AppText variant="body">{leave.note}</AppText>
                  <AppText variant="body">
                    {leave.propertyName}
                    {leave.bedLabel ? ` · ${leave.bedLabel}` : ''}
                  </AppText>
                  {role === 'owner' && leave.status === 'requested' ? (
                    <>
                      <AppButton
                        label={busyId === leave.id ? 'Saving...' : 'Approve'}
                        disabled={busyId !== null}
                        onPress={() => void decide(leave.id, 'approved')}
                      />
                      <AppButton
                        label="Decline"
                        variant="secondary"
                        disabled={busyId !== null}
                        onPress={() => void decide(leave.id, 'declined')}
                      />
                    </>
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

function readName(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object' || !('name' in row) || typeof row.name !== 'string') {
    return null;
  }
  return row.name;
}

function readBedLabel(value: unknown) {
  const bed = Array.isArray(value) ? value[0] : value;
  if (!bed || typeof bed !== 'object') {
    return null;
  }
  const label = 'label' in bed && typeof bed.label === 'string' ? bed.label : '';
  const rooms = 'rooms' in bed ? bed.rooms : null;
  const room = Array.isArray(rooms) ? rooms[0] : rooms;
  const roomName = room && typeof room === 'object' && 'name' in room && typeof room.name === 'string' ? room.name : '';
  if (roomName && label) {
    return `${roomName}, ${label}`;
  }
  return roomName || label || null;
}

function readNestedBedLabel(value: unknown) {
  const booking = Array.isArray(value) ? value[0] : value;
  if (!booking || typeof booking !== 'object' || !('beds' in booking)) {
    return null;
  }
  return readBedLabel(booking.beds);
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
