import { supabase } from '@/lib/supabase';

export type ResidentReport = {
  stayName: string;
  bedLabel: string;
  openMaintenance: number;
  waitingLeave: number;
  rentDueCount: number;
  rentDueAmount: number;
  depositsDueCount: number;
  depositsDueAmount: number;
};

export function reportAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export async function loadResidentReport(): Promise<{ error: string; report: ResidentReport | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', report: null };
  }

  const { data, error } = await supabase.rpc('resident_report');
  if (error) {
    return { error: error.message, report: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.stay_name !== 'string' || typeof row.bed_label !== 'string') {
    return { error: 'The report could not be loaded.', report: null };
  }

  return {
    error: '',
    report: {
      stayName: row.stay_name,
      bedLabel: row.bed_label,
      openMaintenance: numberValue(row.open_maintenance),
      waitingLeave: numberValue(row.waiting_leave),
      rentDueCount: numberValue(row.rent_due_count),
      rentDueAmount: numberValue(row.rent_due_amount),
      depositsDueCount: numberValue(row.deposits_due_count),
      depositsDueAmount: numberValue(row.deposits_due_amount),
    },
  };
}

function numberValue(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}
