import { addIsoDays, kolkataToday } from '@/lib/leave-requests';
import { isBookingStatus, type BookingStatus } from '@/lib/booking-requests';
import { isVisitPart, isVisitStatus, type VisitPart, type VisitStatus } from '@/lib/property-visits';
import { supabase } from '@/lib/supabase';

export type WeekItem = {
  id: string;
  kind: 'visit' | 'arrival';
  propertyId: string;
  name: string;
  locality: string;
  city: string;
  itemOn: string;
  part: VisitPart | null;
  status: VisitStatus | BookingStatus;
  bedLabel: string | null;
};

export type WeekDay = {
  date: string;
  items: WeekItem[];
};

const partOrder: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

const visitStatuses = ['requested', 'confirmed', 'rescheduled'] as const;
const arrivalStatuses = ['requested', 'confirmed'] as const;

export async function loadWeek(userId: string, role: string): Promise<{ error: string; days: WeekDay[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', days: [] };
  }
  if (role === 'admin') {
    return loadAdminWeek();
  }
  if (role !== 'owner' && role !== 'resident') {
    return { error: 'This week is for an owner, a resident, or an administrator.', days: [] };
  }

  const today = kolkataToday();
  const weekEnd = addIsoDays(today, 6);
  const visitQuery =
    role === 'owner'
      ? supabase
          .from('property_visits')
          .select('id, status, property_id, visit_on, visit_part, properties!inner(id, name, locality, city, owner_id)')
          .eq('properties.owner_id', userId)
          .gte('visit_on', today)
          .lte('visit_on', weekEnd)
          .in('status', [...visitStatuses])
      : supabase
          .from('property_visits')
          .select('id, status, property_id, visit_on, visit_part, properties(id, name, locality, city)')
          .eq('user_id', userId)
          .gte('visit_on', today)
          .lte('visit_on', weekEnd)
          .in('status', [...visitStatuses]);

  const arrivalQuery =
    role === 'owner'
      ? supabase
          .from('booking_requests')
          .select('id, status, property_id, move_in, move_in_part, beds(label), properties!inner(id, name, locality, city, owner_id)')
          .eq('properties.owner_id', userId)
          .gte('move_in', today)
          .lte('move_in', weekEnd)
          .in('status', [...arrivalStatuses])
      : supabase
          .from('booking_requests')
          .select('id, status, property_id, move_in, move_in_part, beds(label), properties(id, name, locality, city)')
          .eq('user_id', userId)
          .gte('move_in', today)
          .lte('move_in', weekEnd)
          .in('status', [...arrivalStatuses]);

  const [visitResult, arrivalResult] = await Promise.all([visitQuery, arrivalQuery]);
  if (visitResult.error || arrivalResult.error) {
    return {
      error: visitResult.error?.message || arrivalResult.error?.message || 'This week could not be loaded.',
      days: [],
    };
  }

  return {
    error: '',
    days: groupWeek([
      ...toItems(visitResult.data ?? [], 'visit'),
      ...toItems(arrivalResult.data ?? [], 'arrival'),
    ]),
  };
}

async function loadAdminWeek(): Promise<{ error: string; days: WeekDay[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', days: [] };
  }

  const { data, error } = await supabase.rpc('admin_week');
  if (error) {
    return { error: error.message, days: [] };
  }

  const items = (Array.isArray(data) ? data : []).flatMap((row) => {
    const item = toAdminItem(row);
    return item ? [item] : [];
  });
  return { error: '', days: groupWeek(items) };
}

function toAdminItem(row: {
  kind?: string;
  item_id?: string;
  property_id?: string;
  property_name?: string;
  locality?: string;
  city?: string;
  item_on?: string;
  part?: string | null;
  status?: string;
  bed_label?: string | null;
}) {
  const kind: 'visit' | 'arrival' | null = row.kind === 'visit' ? 'visit' : row.kind === 'arrival' ? 'arrival' : null;
  if (!kind) {
    return null;
  }
  if (typeof row.item_id !== 'string' || typeof row.property_id !== 'string' || typeof row.property_name !== 'string') {
    return null;
  }
  if (typeof row.locality !== 'string' || typeof row.city !== 'string' || typeof row.item_on !== 'string' || typeof row.status !== 'string') {
    return null;
  }
  const status = kind === 'visit' && isVisitStatus(row.status) ? row.status : kind === 'arrival' && isBookingStatus(row.status) ? row.status : null;
  if (!status) {
    return null;
  }
  return {
    id: row.item_id,
    kind,
    propertyId: row.property_id,
    name: row.property_name,
    locality: row.locality,
    city: row.city,
    itemOn: row.item_on.slice(0, 10),
    part: typeof row.part === 'string' && isVisitPart(row.part) ? row.part : null,
    status,
    bedLabel: typeof row.bed_label === 'string' ? row.bed_label : null,
  };
}

function toItems(
  rows: {
    id: string;
    status: string;
    property_id: string;
    visit_on?: string | null;
    move_in?: string | null;
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
    const itemOn = kind === 'visit' ? row.visit_on : row.move_in;
    if (!property || !status || typeof itemOn !== 'string') {
      return [];
    }
    const partValue = kind === 'visit' ? row.visit_part : row.move_in_part;
    const bed = Array.isArray(row.beds) ? row.beds[0] : row.beds;
    return [
      {
        id: row.id,
        kind,
        propertyId: row.property_id,
        name: property.name,
        locality: property.locality,
        city: property.city,
        itemOn: itemOn.slice(0, 10),
        part: typeof partValue === 'string' && isVisitPart(partValue) ? partValue : null,
        status,
        bedLabel: bed && typeof bed.label === 'string' ? bed.label : null,
      },
    ];
  });
}

function groupWeek(items: WeekItem[]) {
  const sorted = [...items].sort((left, right) => {
    const dateDiff = left.itemOn.localeCompare(right.itemOn);
    if (dateDiff !== 0) {
      return dateDiff;
    }
    const partDiff = (left.part ? partOrder[left.part] : 3) - (right.part ? partOrder[right.part] : 3);
    if (partDiff !== 0) {
      return partDiff;
    }
    if (left.kind !== right.kind) {
      return left.kind === 'visit' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  const days: WeekDay[] = [];
  for (const item of sorted) {
    const last = days[days.length - 1];
    if (last && last.date === item.itemOn) {
      last.items.push(item);
    } else {
      days.push({ date: item.itemOn, items: [item] });
    }
  }
  return days;
}
