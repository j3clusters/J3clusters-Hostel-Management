import { supabase } from '@/lib/supabase';
import { addIsoDays, kolkataToday } from '@/lib/leave-requests';
import { isVisitPart } from '@/lib/property-visits';

export const bookingStatusLabel = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
} as const;

export type BookingStatus = keyof typeof bookingStatusLabel;

export function isBookingStatus(value: string): value is BookingStatus {
  return value in bookingStatusLabel;
}

let pendingMoveIn = '';
let pendingMoveInPart = '';

export function setPendingMoveIn(value: string) {
  pendingMoveIn = value;
}

export function peekPendingMoveIn() {
  return pendingMoveIn;
}

export function setPendingMoveInPart(value: string) {
  pendingMoveInPart = value;
}

export function peekPendingMoveInPart() {
  return pendingMoveInPart;
}

export function clearPendingMoveIn() {
  pendingMoveIn = '';
  pendingMoveInPart = '';
}

export function moveInLabel(isoDate: string) {
  return new Date(`${isoDate.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isMoveInDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const today = kolkataToday();
  return value >= today && value <= addIsoDays(today, 30);
}

export async function requestBooking(userId: string, propertyId: string, moveIn: string, moveInPart: string) {
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
  if (!isMoveInDate(moveIn)) {
    return 'Choose a move-in date from today through the next 30 days.';
  }
  if (!isVisitPart(moveInPart)) {
    return 'Choose morning, afternoon, or evening.';
  }

  const { error: insertError } = await supabase.from('booking_requests').insert({
    user_id: userId,
    property_id: propertyId,
    status: 'requested',
    move_in: moveIn,
    move_in_part: moveInPart,
  });

  if (insertError?.code === '23505') {
    return 'You already have a booking request for this stay.';
  }

  return insertError ? insertError.message : '';
}

export async function confirmBookingRequest(requestId: string, bedId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('confirm_booking_request', {
    request_id: requestId,
    target_bed: bedId,
  });

  return error ? error.message : '';
}

export async function checkInBooking(requestId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('check_in_booking', { request_id: requestId });
  return error ? error.message : '';
}

export async function checkOutBooking(requestId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('check_out_booking', { request_id: requestId });
  return error ? error.message : '';
}

export async function updateBookingRequest(requestId: string, status: 'rejected' | 'cancelled') {
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
