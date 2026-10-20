import { HubScreen } from '@/components/navigation/hub-screen';

export default function ActivityScreen() {
  return (
    <HubScreen
      eyebrow="J3cluster"
      title="Activity"
      body="Your visits, enquiries, and booking requests. A booking does not take payment."
      links={[
        { label: 'Visit list', href: '/visit-list', variant: 'primary' },
        { label: 'Booking requests', href: '/booking-requests' },
        { label: 'Enquiries', href: '/enquiries' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Stay reviews', href: '/stay-reviews' },
        { label: 'Today', href: '/today' },
        { label: 'This week', href: '/week' },
      ]}
    />
  );
}
