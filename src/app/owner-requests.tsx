import { HubScreen } from '@/components/navigation/hub-screen';

export default function OwnerRequestsScreen() {
  return (
    <HubScreen
      eyebrow="J3cluster"
      title="Requests"
      body="Visits, bookings, enquiries, maintenance, and leave for your properties."
      links={[
        { label: 'Visit list', href: '/visit-list', variant: 'primary' },
        { label: 'Booking requests', href: '/booking-requests' },
        { label: 'Enquiries', href: '/enquiries' },
        { label: 'Maintenance', href: '/maintenance' },
        { label: 'Leave', href: '/leave' },
        { label: 'Notices', href: '/announcements' },
        { label: 'Stay reviews', href: '/stay-reviews' },
      ]}
    />
  );
}
