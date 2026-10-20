import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { loadAdminReport, reportAmount, type AdminReport } from '@/lib/admin-report';
import { useAuth } from '@/providers/auth-provider';

export default function AdminReportsScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(role === 'admin');
  const [error, setError] = useState(role === 'admin' ? '' : 'Reports are for an administrator.');

  useFocusEffect(
    useCallback(() => {
      if (role !== 'admin') {
        return;
      }

      let active = true;
      void loadAdminReport().then((result) => {
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
        { label: 'Pending owner requests', value: String(report.pendingOwnerRequests) },
        { label: 'Pending properties', value: String(report.pendingProperties) },
        { label: 'Occupied beds', value: String(report.occupiedBeds) },
        { label: 'Open maintenance', value: String(report.openMaintenance) },
        { label: 'Leave requests waiting', value: String(report.waitingLeave) },
        { label: 'Rent charges still due', value: String(report.rentDueCount) },
        { label: 'Rent amount still due', value: reportAmount(report.rentDueAmount) },
      ]
    : [];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Reports</AppText>
        <AppText variant="body">Counts only. Today follows India time. Resident names and phone numbers are not shown.</AppText>
        {role !== 'admin' ? (
          <AppText variant="body">Reports are for an administrator.</AppText>
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
            <AppButton label="Review owner requests" variant="secondary" onPress={() => router.push('/admin-owners')} />
            <AppButton label="Review properties" variant="secondary" onPress={() => router.push('/admin-properties')} />
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
