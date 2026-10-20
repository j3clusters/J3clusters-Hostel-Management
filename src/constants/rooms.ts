export const sharingTypes = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' },
  { value: 'dormitory', label: 'Dormitory' },
] as const;

export type SharingType = (typeof sharingTypes)[number]['value'];

export function isSharingType(value: string): value is SharingType {
  return sharingTypes.some((item) => item.value === value);
}

export function sharingLabel(value: string) {
  return sharingTypes.find((item) => item.value === value)?.label ?? value;
}
