import { supabase } from '@/lib/supabase';

export type AnnouncementItem = {
  id: string;
  propertyId: string;
  propertyName: string;
  message: string;
  postedAt: string;
};

export function announcementDateLabel(postedAt: string) {
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export async function postAnnouncement(
  propertyId: string,
  propertyName: string,
  message: string,
): Promise<{ error: string; announcement: AnnouncementItem | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', announcement: null };
  }

  const cleaned = message.trim();
  if (cleaned.length < 10 || cleaned.length > 200) {
    return { error: 'Write a notice of 10 to 200 characters.', announcement: null };
  }

  const { data, error } = await supabase.rpc('post_announcement', {
    target_property: propertyId,
    announcement_message: cleaned,
  });
  if (error) {
    return { error: error.message, announcement: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.announcement_id !== 'string' || typeof row.posted_at !== 'string') {
    return { error: 'The notice could not be posted.', announcement: null };
  }

  return {
    error: '',
    announcement: {
      id: row.announcement_id,
      propertyId,
      propertyName,
      message: cleaned,
      postedAt: row.posted_at,
    },
  };
}

export async function removeAnnouncement(announcementId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('remove_announcement', { target_announcement: announcementId });
  return error ? error.message : '';
}
