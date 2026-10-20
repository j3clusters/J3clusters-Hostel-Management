export function blankToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function completionLabel(filled: number, total: number) {
  return `${filled} of ${total} details added`;
}
