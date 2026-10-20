import { supabase } from '@/lib/supabase';

export const bookingStatusLabel = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
} as const;

export type BookingStatus = keyof typeof bookingStatusLabel;

export function isBookingStatus(value: string): value is BookingStatus {
  return value in bookingStatusLabel;
}

export async function requestBooking(userId: string, propertyId: string) {
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

  const { error: insertError } = await supabase.from('booking_requests').insert({
    user_id: userId,
    property_id: propertyId,
    status: 'requested',
  });

  if (insertError?.code === '23505') {
    return 'You already have a booking request for this stay.';
  }

  return insertError ? insertError.message : '';
}

export async function updateBookingRequest(requestId: string, status: 'confirmed' | 'rejected' | 'cancelled') {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { data, error } = await supabase
    .from('booking_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('id')
    .maybeSingle();

  if (error) {
    return error.message;
  }
  if (!data) {
    return 'This booking request could not be updated.';
  }

  return '';
}
