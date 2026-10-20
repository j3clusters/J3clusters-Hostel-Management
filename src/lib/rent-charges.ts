import { supabase } from '@/lib/supabase';

export type RentChargeStatus = 'due' | 'received';

export type RentCharge = {
  id: string;
  bookingRequestId: string;
  amount: number | string;
  periodMonth: string;
  status: RentChargeStatus;
  receiptNumber: string | null;
  receivedAt: string | null;
};

export function isRentChargeStatus(value: string): value is RentChargeStatus {
  return value === 'due' || value === 'received';
}

export function currentRentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return `${parts.slice(0, 7)}-01`;
}

export function rentChargeLabel(charge: Pick<RentCharge, 'amount' | 'periodMonth' | 'status'>) {
  const amount = Number(charge.amount);
  const rent = Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : 'Rent unavailable';
  const month = new Date(`${charge.periodMonth.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  return `${month} · ${rent} ${charge.status === 'received' ? 'received' : 'due'}`;
}

export async function recordRentCharge(requestId: string): Promise<{ error: string; charge: RentCharge | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', charge: null };
  }

  const { data, error } = await supabase.rpc('record_rent_charge', { request_id: requestId });
  if (error) {
    return { error: error.message, charge: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.charge_id !== 'string' || typeof row.charge_month !== 'string') {
    return { error: 'Rent could not be recorded.', charge: null };
  }

  return {
    error: '',
    charge: {
      id: row.charge_id,
      bookingRequestId: requestId,
      amount: row.charge_amount,
      periodMonth: row.charge_month,
      status: 'due',
      receiptNumber: null,
      receivedAt: null,
    },
  };
}

export async function markRentReceived(chargeId: string): Promise<{ error: string; receiptNumber: string | null; receivedAt: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', receiptNumber: null, receivedAt: null };
  }

  const { data, error } = await supabase.rpc('mark_rent_received', { target_charge: chargeId });
  if (error) {
    return { error: error.message, receiptNumber: null, receivedAt: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.receipt_number !== 'string' || typeof row.received_at !== 'string') {
    return { error: 'The receipt could not be saved.', receiptNumber: null, receivedAt: null };
  }

  return { error: '', receiptNumber: row.receipt_number, receivedAt: row.received_at };
}
