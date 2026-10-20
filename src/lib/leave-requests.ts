import { supabase } from '@/lib/supabase';

export type LeaveStatus = 'requested' | 'approved' | 'declined';

export type LeaveItem = {
  id: string;
  propertyName: string;
  bedLabel: string | null;
  startsOn: string;
  endsOn: string;
  note: string;
  status: LeaveStatus;
};

const leaveStatusLabel = {
  requested: 'Requested',
  approved: 'Approved',
  declined: 'Declined',
} as const;

export function isLeaveStatus(value: string): value is LeaveStatus {
  return value === 'requested' || value === 'approved' || value === 'declined';
}

export function leaveStatusText(status: LeaveStatus) {
  return leaveStatusLabel[status];
}

export function kolkataToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addIsoDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function leaveDateLabel(isoDate: string) {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function leaveRangeLabel(startsOn: string, endsOn: string) {
  const start = new Date(`${startsOn.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const end = new Date(`${endsOn.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

export function leaveDateChoices(fromIso: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const value = addIsoDays(fromIso, index);
    return { value, label: leaveDateLabel(value) };
  });
}

export async function requestLeave(
  bookingId: string,
  startsOn: string,
  endsOn: string,
  note: string,
  propertyName: string,
  bedLabel: string | null,
): Promise<{ error: string; leave: LeaveItem | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', leave: null };
  }

  const cleanedNote = note.trim();
  if (cleanedNote.length < 10 || cleanedNote.length > 200) {
    return { error: 'Describe the leave in 10 to 200 characters.', leave: null };
  }
  if (endsOn < startsOn) {
    return { error: 'Choose an end date on or after the start.', leave: null };
  }

  const { data, error } = await supabase.rpc('request_leave', {
    target_booking: bookingId,
    leave_start: startsOn,
    leave_end: endsOn,
    leave_note: cleanedNote,
  });
  if (error) {
    return { error: error.message, leave: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.leave_id !== 'string') {
    return { error: 'The leave request could not be saved.', leave: null };
  }

  return {
    error: '',
    leave: {
      id: row.leave_id,
      propertyName,
      bedLabel,
      startsOn,
      endsOn,
      note: cleanedNote,
      status: 'requested',
    },
  };
}

export async function reviewLeave(leaveId: string, decision: 'approved' | 'declined') {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('review_leave', { target_leave: leaveId, decision });
  return error ? error.message : '';
}
