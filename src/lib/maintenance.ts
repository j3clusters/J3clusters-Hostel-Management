import type { MaintenanceCategory } from '@/constants/maintenance';
import { isMaintenanceCategory } from '@/constants/maintenance';
import { supabase } from '@/lib/supabase';

export type MaintenanceStatus = 'open' | 'done';

export type MaintenanceItem = {
  id: string;
  propertyName: string;
  bedLabel: string | null;
  category: MaintenanceCategory;
  note: string;
  status: MaintenanceStatus;
  reportedAt: string;
};

export function isMaintenanceStatus(value: string): value is MaintenanceStatus {
  return value === 'open' || value === 'done';
}

export function maintenanceDateLabel(reportedAt: string) {
  const date = new Date(reportedAt);
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

export async function reportMaintenance(
  bookingId: string,
  category: MaintenanceCategory,
  note: string,
  propertyName: string,
  bedLabel: string | null,
): Promise<{ error: string; report: MaintenanceItem | null }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', report: null };
  }

  const cleanedNote = note.trim();
  if (cleanedNote.length < 10 || cleanedNote.length > 200) {
    return { error: 'Describe the problem in 10 to 200 characters.', report: null };
  }
  if (!isMaintenanceCategory(category)) {
    return { error: 'Choose a problem type.', report: null };
  }

  const { data, error } = await supabase.rpc('report_maintenance', {
    target_booking: bookingId,
    issue_category: category,
    issue_note: cleanedNote,
  });
  if (error) {
    return { error: error.message, report: null };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.request_id !== 'string' || typeof row.reported_at !== 'string') {
    return { error: 'The report could not be saved.', report: null };
  }

  return {
    error: '',
    report: {
      id: row.request_id,
      propertyName,
      bedLabel,
      category,
      note: cleanedNote,
      status: 'open',
      reportedAt: row.reported_at,
    },
  };
}

export async function completeMaintenance(requestId: string) {
  if (!supabase) {
    return 'Supabase is not connected.';
  }

  const { error } = await supabase.rpc('complete_maintenance', { target_request: requestId });
  return error ? error.message : '';
}
