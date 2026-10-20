export type StayAction = 'save' | 'visit';

export function isStayAction(value: string | undefined): value is StayAction {
  return value === 'save' || value === 'visit';
}

export function stayReturnPath(propertyId: string, action: StayAction) {
  return `/property/${propertyId}?action=${action}` as const;
}
