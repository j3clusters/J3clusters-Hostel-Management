import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { isMaintenanceCategory, maintenanceCategories, maintenanceCategoryLabel, type MaintenanceCategory } from '@/constants/maintenance';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  completeMaintenance,
  isMaintenanceStatus,
  maintenanceDateLabel,
  reportMaintenance,
  type MaintenanceItem,
} from '@/lib/maintenance';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type StayOption = {
  bookingId: string;
  propertyName: string;
  bedLabel: string | null;
};

export default function MaintenanceScreen() {
  const { user, role } = useAuth();
  const canUse = role === 'owner' || role === 'resident';
  const [stays, setStays] = useState<StayOption[]>([]);
  const [reports, setReports] = useState<MaintenanceItem[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [category, setCategory] = useState<MaintenanceCategory>('plumbing');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(canUse);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(
    !user ? 'Sign in to report a problem.' : canUse ? '' : 'Maintenance reports are for residents and owners.',
  );

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || !canUse) {
        return;
      }

      let active = true;
      const reportsQuery = supabase
        .from('maintenance_requests')
        .select('id, category, note, status, created_at, properties(name), booking_requests(beds(label, rooms(name)))')
        .order('created_at', { ascending: false });
      const staysQuery =
        role === 'resident'
          ? supabase
              .from('booking_requests')
              .select('id, properties(name), beds(label, rooms(name))')
              .eq('user_id', user.id)
              .eq('status', 'checked_in')
          : Promise.resolve({ data: [], error: null });

      void Promise.all([staysQuery, reportsQuery]).then(([stayResult, reportResult]) => {
        if (!active) {
          return;
        }
        if (stayResult.error || reportResult.error) {
          setError(stayResult.error?.message || reportResult.error?.message || 'Maintenance reports could not be loaded.');
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
        setReports(
          (reportResult.data ?? []).flatMap((row) => {
            const propertyName = readName(row.properties);
            if (
              typeof row.id !== 'string' ||
              typeof row.note !== 'string' ||
              typeof row.created_at !== 'string' ||
              !isMaintenanceCategory(row.category) ||
              !isMaintenanceStatus(row.status) ||
              !propertyName
            ) {
              return [];
            }
            return [
              {
                id: row.id,
                propertyName,
                bedLabel: readNestedBedLabel(row.booking_requests),
                category: row.category,
                note: row.note,
                status: row.status,
                reportedAt: row.created_at,
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

  async function sendReport() {
    if (saving || !bookingId) {
      return;
    }

    const stay = stays.find((item) => item.bookingId === bookingId);
    if (!stay) {
      return;
    }

    setSaving(true);
    setError('');
    const result = await reportMaintenance(stay.bookingId, category, note, stay.propertyName, stay.bedLabel);
    setSaving(false);

    if (result.error || !result.report) {
      setError(result.error || 'The report could not be saved.');
      return;
    }

    setReports((current) => [result.report as MaintenanceItem, ...current]);
    setNote('');
  }

  async function markDone(requestId: string) {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const doneError = await completeMaintenance(requestId);
    setBusyId(null);

    if (doneError) {
      setError(doneError);
      return;
    }

    setReports((current) => current.map((report) => (report.id === requestId ? { ...report, status: 'done' } : report)));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Maintenance</AppText>
        <AppText variant="body">A checked-in resident can report a problem. The owner marks it done. This does not take payment.</AppText>
        {!canUse ? (
          <AppText variant="body">{error}</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && stays.length === 0 && reports.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            {role === 'resident' ? (
              stays.length === 0 ? (
                <EmptyState title="No checked-in stay" message="Check in before reporting a problem at a property." />
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
                  <AppText variant="body">Problem</AppText>
                  <View style={styles.choices}>
                    {maintenanceCategories.map((item) => (
                      <Pressable
                        key={item.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: category === item.value }}
                        onPress={() => setCategory(item.value)}
                        style={[styles.choice, category === item.value && styles.choiceSelected]}>
                        <AppText variant="body" style={category === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                          {item.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                  <AppTextField label="What needs fixing?" value={note} onChangeText={setNote} autoCapitalize="sentences" multiline />
                  <AppButton label={saving ? 'Sending...' : 'Report problem'} disabled={saving} onPress={() => void sendReport()} />
                </>
              )
            ) : null}
            {reports.length === 0 && !(role === 'resident' && stays.length === 0) ? (
              <EmptyState
                title="No reports"
                message={role === 'owner' ? 'Problems from checked-in residents will appear here.' : 'Your reports will appear here.'}
              />
            ) : (
              reports.map((report) => (
                <View key={report.id} style={styles.card}>
                  <StatusBadge label={report.status === 'done' ? 'Done' : 'Open'} />
                  <AppText variant="body" style={styles.name}>
                    {maintenanceCategoryLabel(report.category)}
                  </AppText>
                  <AppText variant="body">{report.note}</AppText>
                  <AppText variant="body">
                    {report.propertyName}
                    {report.bedLabel ? ` · ${report.bedLabel}` : ''} · {maintenanceDateLabel(report.reportedAt)}
                  </AppText>
                  {role === 'owner' && report.status === 'open' ? (
                    <AppButton
                      label={busyId === report.id ? 'Saving...' : 'Mark done'}
                      disabled={busyId !== null}
                      onPress={() => void markDone(report.id)}
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
