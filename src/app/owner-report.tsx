import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { loadOwnerReport, reportAmount, type OwnerReport } from '@/lib/owner-report';
import { useAuth } from '@/providers/auth-provider';

export default function OwnerReportScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const [report, setReport] = useState<OwnerReport | null>(null);
  const [loading, setLoading] = useState(role === 'owner');
  const [error, setError] = useState(role === 'owner' ? '' : 'This report is for an owner.');

  useFocusEffect(
    useCallback(() => {
      if (role !== 'owner') {
        return;
      }

      let active = true;
      void loadOwnerReport().then((result) => {
        if (!active) {
          return;
        }
        if (result.error || !result.report) {
          setError(result.error || 'The report could not be loaded.');
          setLoading(false);
          return;
        }
        setReport(result.report);
        setError('');
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [role]),
  );

  const rows = report
    ? [
        { label: 'Visits today', value: String(report.visitsToday) },
        { label: 'Arrivals today', value: String(report.arrivalsToday) },
        { label: 'Properties waiting for approval', value: String(report.pendingProperties) },
        { label: 'Occupied beds', value: String(report.occupiedBeds) },
        { label: 'Open maintenance', value: String(report.openMaintenance) },
        { label: 'Leave requests waiting', value: String(report.waitingLeave) },
        { label: 'Rent charges still due', value: String(report.rentDueCount) },
        { label: 'Rent amount still due', value: reportAmount(report.rentDueAmount) },
        { label: 'Deposits still due', value: String(report.depositsDueCount) },
        { label: 'Deposit amount still due', value: reportAmount(report.depositsDueAmount) },
      ]
    : [];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">My report</AppText>
        <AppText variant="body">Counts for your properties only. Today follows India time. Resident names and phone numbers are not shown.</AppText>
        {role !== 'owner' ? (
          <AppText variant="body">This report is for an owner.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && !report ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            {rows.map((row) => (
              <View key={row.label} style={styles.card}>
                <AppText variant="body">{row.label}</AppText>
                <AppText variant="body" style={styles.value}>
                  {row.value}
                </AppText>
              </View>
            ))}
            <AppButton label="Visit list" variant="secondary" onPress={() => router.push('/visit-list')} />
            <AppButton label="Booking requests" variant="secondary" onPress={() => router.push('/booking-requests')} />
            <AppButton label="Maintenance" variant="secondary" onPress={() => router.push('/maintenance')} />
            <AppButton label="Leave" variant="secondary" onPress={() => router.push('/leave')} />
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
    gap: Spacing.one,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  value: {
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
