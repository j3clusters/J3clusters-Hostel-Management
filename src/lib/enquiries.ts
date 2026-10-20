import { supabase } from '@/lib/supabase';

let pendingEnquiryMessage = '';

export function setPendingEnquiryMessage(message: string) {
  pendingEnquiryMessage = message.trim();
}

export function peekPendingEnquiryMessage() {
  return pendingEnquiryMessage;
}

export function clearPendingEnquiryMessage() {
  pendingEnquiryMessage = '';
}

export async function sendEnquiry(userId: string, propertyId: string, message: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const trimmed = message.trim();
  if (trimmed.length < 10) {
    return 'Write an enquiry of at least 10 characters.';
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

  const { error: insertError } = await supabase.from('enquiries').insert({
    user_id: userId,
    property_id: propertyId,
    message: trimmed,
    status: 'open',
  });

  if (insertError?.code === '23505') {
    return 'You already have an open enquiry for this stay.';
  }

  return insertError ? insertError.message : '';
}

export async function closeEnquiry(enquiryId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { data, error } = await supabase
    .from('enquiries')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', enquiryId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    return error.message;
  }
  if (!data) {
    return 'This enquiry could not be closed.';
  }

  return '';
}
