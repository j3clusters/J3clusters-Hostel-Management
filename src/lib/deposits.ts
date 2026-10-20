import { supabase } from '@/lib/supabase';

export type DepositStatus = 'due' | 'received';

export type Deposit = {
  id: string;
  bookingRequestId: string;
  amount: number | string;
  status: DepositStatus;
};

export function isDepositStatus(value: string): value is DepositStatus {
  return value === 'due' || value === 'received';
}

export function depositLabel(deposit: Pick<Deposit, 'amount' | 'status'>) {
  const amount = Number(deposit.amount);
  const rent = Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : 'Deposit unavailable';
  return `Deposit · ${rent} ${deposit.status === 'received' ? 'received' : 'due'}`;
}

export async function recordDeposit(requestId: string, amountText: string): Promise<{ error: string; deposit: Deposit | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', deposit: null };
  }

  const amount = Number(amountText.trim());
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    return { error: 'Enter a deposit from ₹1 to ₹10,00,000.', deposit: null };
  }

  const { data, error } = await supabase.rpc('record_deposit', {
    request_id: requestId,
    deposit_amount: amount,
  });
  if (error) {
    return { error: error.message, deposit: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.deposit_id !== 'string') {
    return { error: 'The deposit could not be recorded.', deposit: null };
  }

  return {
    error: '',
    deposit: {
      id: row.deposit_id,
      bookingRequestId: requestId,
      amount: row.saved_amount,
      status: 'due',
    },
  };
}

export async function markDepositReceived(depositId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('mark_deposit_received', { target_deposit: depositId });
  return error ? error.message : '';
}
