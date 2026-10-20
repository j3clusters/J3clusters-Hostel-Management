import { supabase } from '@/lib/supabase';

export const visitStatusLabel = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export type VisitStatus = keyof typeof visitStatusLabel;

export function isVisitStatus(value: string): value is VisitStatus {
  return value in visitStatusLabel;
}

export async function requestVisit(userId: string, propertyId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    return error.message;
  }
  if (!data) {
    return 'This stay is not available.';
  }

  const { error: insertError } = await supabase.from('property_visits').insert({
    user_id: userId,
    property_id: propertyId,
    status: 'requested',
  });

  if (insertError?.code === '23505') {
    return 'You already have a visit request for this stay.';
  }

  return insertError ? insertError.message : '';
}

export async function updateVisit(visitId: string, status: 'confirmed' | 'completed' | 'cancelled') {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { data, error } = await supabase
    .from('property_visits')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', visitId)
    .select('id')
    .maybeSingle();

  if (error) {
    return error.message;
  }
  if (!data) {
    return 'This visit could not be updated.';
  }

  return '';
}

export async function rescheduleVisit(visitId: string, visitOn: string) {
  if (!supabase) {
    return { error: 'Supabase is not connected.', visitOn: null as string | null };
  }

  const { data, error } = await supabase.rpc('reschedule_visit', {
    target_visit: visitId,
    next_date: visitOn,
  });
  if (error) {
    return { error: error.message, visitOn: null as string | null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.visit_on !== 'string') {
    return { error: 'The visit could not be rescheduled.', visitOn: null as string | null };
  }

  return { error: '', visitOn: row.visit_on };
}
