import { supabase } from '@/lib/supabase';

export type AdminReport = {
  pendingOwnerRequests: number;
  pendingProperties: number;
  occupiedBeds: number;
  openMaintenance: number;
  waitingLeave: number;
  rentDueCount: number;
  rentDueAmount: number;
  visitsToday: number;
  arrivalsToday: number;
};

export function reportAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export async function loadAdminReport(): Promise<{ error: string; report: AdminReport | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', report: null };
  }

  const { data, error } = await supabase.rpc('admin_report');
  if (error) {
    return { error: error.message, report: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { error: 'The report could not be loaded.', report: null };
  }

  return {
    error: '',
    report: {
      pendingOwnerRequests: numberValue(row.pending_owner_requests),
      pendingProperties: numberValue(row.pending_properties),
      occupiedBeds: numberValue(row.occupied_beds),
      openMaintenance: numberValue(row.open_maintenance),
      waitingLeave: numberValue(row.waiting_leave),
      rentDueCount: numberValue(row.rent_due_count),
      rentDueAmount: numberValue(row.rent_due_amount),
      visitsToday: numberValue(row.visits_today),
      arrivalsToday: numberValue(row.arrivals_today),
    },
  };
}

function numberValue(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}
