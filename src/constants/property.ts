export const propertyCategories = [
  { value: 'pg', label: 'PG' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'guest_house', label: 'Guest house' },
] as const;

export type PropertyCategory = (typeof propertyCategories)[number]['value'];

export const categoryLabel: Record<PropertyCategory, string> = {
  pg: 'PG',
  hostel: 'Hostel',
  hotel: 'Hotel',
  guest_house: 'Guest house',
};

export function formatMonthlyRent(value: number | string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Rent unavailable';
  }
  return `₹${amount.toLocaleString('en-IN')} / month`;
}

export function isPropertyCategory(value: string): value is PropertyCategory {
  return value === 'pg' || value === 'hostel' || value === 'hotel' || value === 'guest_house';
}
