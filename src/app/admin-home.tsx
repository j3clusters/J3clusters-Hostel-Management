import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MetricGrid } from '@/components/dashboard/metric-grid';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { loadAdminReport, reportAmount, type AdminReport } from '@/lib/admin-report';
import { useAuth } from '@/providers/auth-provider';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(role === 'admin');
  const [error, setError] = useState(role === 'admin' ? '' : 'This home is for an administrator.');

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
          setError(result.error || 'The summary could not be loaded.');
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
        { label: 'Owner requests waiting', value: String(report.pendingOwnerRequests) },
        { label: 'Properties waiting', value: String(report.pendingProperties) },
        { label: 'Visits today', value: String(report.visitsToday) },
        { label: 'Arrivals today', value: String(report.arrivalsToday) },
        { label: 'Occupied beds', value: String(report.occupiedBeds) },
        { label: 'Rent still due', value: reportAmount(report.rentDueAmount) },
      ]
    : [];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3 Cluster</AppText>
        <AppText variant="title">Admin home</AppText>
        <AppText variant="body">Counts only. Today follows India time. Resident names and phone numbers are not shown.</AppText>
        {role !== 'admin' ? (
          <AppText variant="body">This home is for an administrator.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && !report ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            <MetricGrid rows={rows} />
            <AppButton label="Today" onPress={() => router.push('/today')} />
            <AppButton label="This week" variant="secondary" onPress={() => router.push('/week')} />
            <AppButton label="Reports" variant="secondary" onPress={() => router.push('/admin-reports')} />
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
