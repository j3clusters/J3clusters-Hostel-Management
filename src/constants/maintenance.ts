export const maintenanceCategories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
] as const;

export type MaintenanceCategory = (typeof maintenanceCategories)[number]['value'];

export function isMaintenanceCategory(value: string): value is MaintenanceCategory {
  return maintenanceCategories.some((item) => item.value === value);
}

export function maintenanceCategoryLabel(value: string) {
  return maintenanceCategories.find((item) => item.value === value)?.label ?? value;
}
