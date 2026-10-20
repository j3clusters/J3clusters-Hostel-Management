import { supabase } from '@/lib/supabase';

export async function saveApprovedStay(userId: string, propertyId: string) {
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

  const { error: insertError } = await supabase.from('saved_properties').insert({
    user_id: userId,
    property_id: propertyId,
  });

  if (insertError && insertError.code !== '23505') {
    return insertError.message;
  }

  return '';
}

export async function removeSavedStay(userId: string, propertyId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);

  return error ? error.message : '';
}
