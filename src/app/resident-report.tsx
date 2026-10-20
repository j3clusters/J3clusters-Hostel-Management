import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { loadResidentReport, reportAmount, type ResidentReport } from '@/lib/resident-report';
import { useAuth } from '@/providers/auth-provider';

export default function ResidentReportScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const [report, setReport] = useState<ResidentReport | null>(null);
  const [loading, setLoading] = useState(role === 'resident');
  const [error, setError] = useState(role === 'resident' ? '' : 'This summary is for a resident.');

  useFocusEffect(
    useCallback(() => {
      if (role !== 'resident') {
        return;
      }

      let active = true;
      void loadResidentReport().then((result) => {
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
        { label: 'Visits today', value: String(report.visitsToday) },
        { label: 'Arrivals today', value: String(report.arrivalsToday) },
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
        <AppText variant="title">My stay</AppText>
        <AppText variant="body">Your stay only. Today follows India time. Other residents are not shown.</AppText>
        {role !== 'resident' ? (
          <AppText variant="body">This summary is for a resident.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && !report ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : report ? (
          <>
            <View style={styles.card}>
              <AppText variant="body">Checked in</AppText>
              <AppText variant="body" style={styles.value}>
                {report.stayName ? report.stayName : 'Not checked in'}
              </AppText>
              {report.bedLabel ? <AppText variant="body">{report.bedLabel}</AppText> : null}
            </View>
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
        ) : null}
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
