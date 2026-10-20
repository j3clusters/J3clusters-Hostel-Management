import { supabase } from '@/lib/supabase';

export const notificationScreens = [
  'announcements',
  'leave',
  'maintenance',
  'booking-requests',
  'visit-list',
  'enquiries',
  'admin-properties',
  'my-properties',
  'admin-owners',
  'owner-profile',
  'stay-reviews',
] as const;

export type NotificationScreen = (typeof notificationScreens)[number];

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  screen: NotificationScreen;
  readAt: string | null;
  createdAt: string;
};

export function isNotificationScreen(value: string): value is NotificationScreen {
  return notificationScreens.some((screen) => screen === value);
}

export function notificationDateLabel(createdAt: string) {
  const date = new Date(createdAt);
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

export async function markNotificationRead(notificationId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('mark_notification_read', { target_notification: notificationId });
  return error ? error.message : '';
}
