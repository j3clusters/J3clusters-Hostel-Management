export type StayAction = 'save' | 'visit' | 'enquiry' | 'booking';

export function isStayAction(value: string | undefined): value is StayAction {
  return value === 'save' || value === 'visit' || value === 'enquiry' || value === 'booking';
}

export function stayReturnPath(propertyId: string, action: StayAction) {
  return `/property/${propertyId}?action=${action}` as const;
}
