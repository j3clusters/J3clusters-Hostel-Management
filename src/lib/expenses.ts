import type { ExpenseCategory } from '@/constants/expenses';
import { isExpenseCategory } from '@/constants/expenses';
import { supabase } from '@/lib/supabase';

export type ExpenseItem = {
  id: string;
  propertyId: string;
  propertyName: string;
  category: ExpenseCategory;
  note: string;
  amount: number | string;
  spentOn: string;
};

export function expenseAmountLabel(amount: number | string) {
  const value = Number(amount);
  return Number.isFinite(value) ? `₹${value.toLocaleString('en-IN')}` : 'Amount unavailable';
}

export function expenseDateLabel(spentOn: string) {
  return new Date(`${spentOn.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export async function recordExpense(
  propertyId: string,
  category: ExpenseCategory,
  note: string,
  amountText: string,
  propertyName: string,
): Promise<{ error: string; expense: ExpenseItem | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', expense: null };
  }

  const cleanedNote = note.trim();
  if (cleanedNote.length < 3 || cleanedNote.length > 120) {
    return { error: 'Enter a note of 3 to 120 characters.', expense: null };
  }
  if (!isExpenseCategory(category)) {
    return { error: 'Choose an expense type.', expense: null };
  }

  const amount = Number(amountText.trim());
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    return { error: 'Enter an amount from ₹1 to ₹10,00,000.', expense: null };
  }

  const { data, error } = await supabase.rpc('record_expense', {
    target_property: propertyId,
    expense_category: category,
    expense_note: cleanedNote,
    expense_amount: amount,
  });
  if (error) {
    return { error: error.message, expense: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.expense_id !== 'string' || typeof row.spent_on !== 'string') {
    return { error: 'The expense could not be saved.', expense: null };
  }

  return {
    error: '',
    expense: {
      id: row.expense_id,
      propertyId,
      propertyName,
      category,
      note: cleanedNote,
      amount,
      spentOn: row.spent_on,
    },
  };
}
