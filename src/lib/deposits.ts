import { supabase } from '@/lib/supabase';

export type DepositStatus = 'due' | 'received' | 'returned';

export type Deposit = {
  id: string;
  bookingRequestId: string;
  amount: number | string;
  status: DepositStatus;
  receiptNumber: string | null;
  receivedAt: string | null;
  returnedAt: string | null;
};

export function isDepositStatus(value: string): value is DepositStatus {
  return value === 'due' || value === 'received' || value === 'returned';
}

export function depositLabel(deposit: Pick<Deposit, 'amount' | 'status'>) {
  const amount = Number(deposit.amount);
  const rent = Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : 'Deposit unavailable';
  const word = deposit.status === 'returned' ? 'returned' : deposit.status === 'received' ? 'received' : 'due';
  return `Deposit · ${rent} ${word}`;
}

export function depositReturnedLabel(returnedAt: string) {
  const date = new Date(returnedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Returned';
  }
  const when = date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `Returned · ${when}`;
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
      receiptNumber: null,
      receivedAt: null,
      returnedAt: null,
    },
  };
}

export async function markDepositReceived(
  depositId: string,
): Promise<{ error: string; receiptNumber: string | null; receivedAt: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', receiptNumber: null, receivedAt: null };
  }

  const { data, error } = await supabase.rpc('mark_deposit_received', { target_deposit: depositId });
  if (error) {
    return { error: error.message, receiptNumber: null, receivedAt: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.receipt_number !== 'string' || typeof row.received_at !== 'string') {
    return { error: 'The receipt could not be saved.', receiptNumber: null, receivedAt: null };
  }

  return { error: '', receiptNumber: row.receipt_number, receivedAt: row.received_at };
}

export async function returnDeposit(depositId: string): Promise<{ error: string; returnedAt: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', returnedAt: null };
  }

  const { data, error } = await supabase.rpc('return_deposit', { target_deposit: depositId });
  if (error) {
    return { error: error.message, returnedAt: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.returned_at !== 'string') {
    return { error: 'The deposit could not be returned.', returnedAt: null };
  }

  return { error: '', returnedAt: row.returned_at };
}
