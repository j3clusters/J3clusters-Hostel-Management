export function receiptLabel(receiptNumber: string, receivedAt: string) {
  const date = new Date(receivedAt);
  const when = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
  return when ? `Receipt ${receiptNumber} · ${when}` : `Receipt ${receiptNumber}`;
}
