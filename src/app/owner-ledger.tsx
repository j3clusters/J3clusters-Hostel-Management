import { HubScreen } from '@/components/navigation/hub-screen';

export default function OwnerLedgerScreen() {
  return (
    <HubScreen
      eyebrow="J3cluster"
      title="Ledger"
      body="Rent and deposits are recorded on a booking. Recording rent writes an invoice. Marking it received writes a receipt. This does not take a payment."
      links={[
        { label: 'Booking requests', href: '/booking-requests', variant: 'primary' },
        { label: 'Expenses', href: '/expenses' },
        { label: 'My report', href: '/owner-report' },
      ]}
    />
  );
}
