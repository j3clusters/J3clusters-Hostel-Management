import { supabase } from '@/lib/supabase';

export async function uploadPropertyCover(propertyId: string, uri: string, contentType: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }
  if (!contentType.startsWith('image/')) {
    return 'Choose an image file.';
  }

  const file = await fetch(uri);
  const body = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('property-photos').upload(`${propertyId}/cover`, body, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    return uploadError.message;
  }

  const { error: saveError } = await supabase.rpc('set_property_cover', { target_id: propertyId });
  return saveError ? saveError.message : '';
}
