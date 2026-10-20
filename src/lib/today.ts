import { kolkataToday } from '@/lib/leave-requests';
import { isBookingStatus, type BookingStatus } from '@/lib/booking-requests';
import { isVisitPart, isVisitStatus, type VisitPart, type VisitStatus } from '@/lib/property-visits';
import { supabase } from '@/lib/supabase';

export type TodayItem = {
  id: string;
  propertyId: string;
  name: string;
  locality: string;
  city: string;
  part: VisitPart | null;
  status: VisitStatus | BookingStatus;
  bedLabel: string | null;
};

const partOrder: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

const visitStatuses = ['requested', 'confirmed', 'rescheduled'] as const;
const arrivalStatuses = ['requested', 'confirmed'] as const;

export async function loadToday(userId: string, role: string): Promise<{ error: string; visits: TodayItem[]; arrivals: TodayItem[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', visits: [], arrivals: [] };
  }
  if (role !== 'owner' && role !== 'resident') {
    return { error: 'Today is for an owner or a resident.', visits: [], arrivals: [] };
  }

  const today = kolkataToday();
  const visitQuery =
    role === 'owner'
      ? supabase
          .from('property_visits')
          .select('id, status, property_id, visit_part, properties!inner(id, name, locality, city, owner_id)')
          .eq('properties.owner_id', userId)
          .eq('visit_on', today)
          .in('status', [...visitStatuses])
      : supabase
          .from('property_visits')
          .select('id, status, property_id, visit_part, properties(id, name, locality, city)')
          .eq('user_id', userId)
          .eq('visit_on', today)
          .in('status', [...visitStatuses]);

  const arrivalQuery =
    role === 'owner'
      ? supabase
          .from('booking_requests')
          .select('id, status, property_id, move_in_part, beds(label), properties!inner(id, name, locality, city, owner_id)')
          .eq('properties.owner_id', userId)
          .eq('move_in', today)
          .in('status', [...arrivalStatuses])
      : supabase
          .from('booking_requests')
          .select('id, status, property_id, move_in_part, beds(label), properties(id, name, locality, city)')
          .eq('user_id', userId)
          .eq('move_in', today)
          .in('status', [...arrivalStatuses]);

  const [visitResult, arrivalResult] = await Promise.all([visitQuery, arrivalQuery]);
  if (visitResult.error || arrivalResult.error) {
    return {
      error: visitResult.error?.message || arrivalResult.error?.message || 'Today could not be loaded.',
      visits: [],
      arrivals: [],
    };
  }

  return {
    error: '',
    visits: sortToday(toItems(visitResult.data ?? [], 'visit')),
    arrivals: sortToday(toItems(arrivalResult.data ?? [], 'arrival')),
  };
}

function toItems(
  rows: {
    id: string;
    status: string;
    property_id: string;
    visit_part?: string | null;
    move_in_part?: string | null;
    beds?: { label: string } | { label: string }[] | null;
    properties: { id: string; name: string; locality: string; city: string } | { id: string; name: string; locality: string; city: string }[] | null;
  }[],
  kind: 'visit' | 'arrival',
) {
  return rows.flatMap((row) => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const status = kind === 'visit' && isVisitStatus(row.status) ? row.status : kind === 'arrival' && isBookingStatus(row.status) ? row.status : null;
    if (!property || !status) {
      return [];
    }
    const partValue = kind === 'visit' ? row.visit_part : row.move_in_part;
    const bed = Array.isArray(row.beds) ? row.beds[0] : row.beds;
    return [
      {
        id: row.id,
        propertyId: row.property_id,
        name: property.name,
        locality: property.locality,
        city: property.city,
        part: typeof partValue === 'string' && isVisitPart(partValue) ? partValue : null,
        status,
        bedLabel: bed && typeof bed.label === 'string' ? bed.label : null,
      },
    ];
  });
}

function sortToday(items: TodayItem[]) {
  return [...items].sort((left, right) => {
    const partDiff = (left.part ? partOrder[left.part] : 3) - (right.part ? partOrder[right.part] : 3);
    if (partDiff !== 0) {
      return partDiff;
    }
    return left.name.localeCompare(right.name);
  });
}
