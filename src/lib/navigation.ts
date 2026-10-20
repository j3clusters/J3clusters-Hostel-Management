import type { Href } from 'expo-router';

import type { AppRole } from '@/providers/auth-provider';

export type TabItem = {
  id: string;
  label: string;
  href: Href;
  match: string[];
};

const guestTabs: TabItem[] = [
  { id: 'find', label: 'Find', href: '/find-a-stay', match: ['/find-a-stay', '/saved-stays'] },
  { id: 'account', label: 'Account', href: '/sign-in', match: ['/sign-in', '/sign-up', '/reset-password', '/owner-login'] },
];

const residentTabs: TabItem[] = [
  { id: 'find', label: 'Find', href: '/find-a-stay', match: ['/find-a-stay'] },
  { id: 'saved', label: 'Saved', href: '/saved-stays', match: ['/saved-stays'] },
  {
    id: 'stay',
    label: 'My Stay',
    href: '/resident-report',
    match: ['/resident-report', '/today', '/week', '/maintenance', '/leave', '/announcements'],
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    match: ['/activity', '/visit-list', '/enquiries', '/booking-requests', '/notifications', '/stay-reviews'],
  },
  { id: 'profile', label: 'Profile', href: '/resident-profile', match: ['/resident-profile'] },
];

const ownerTabs: TabItem[] = [
  { id: 'home', label: 'Home', href: '/owner-report', match: ['/owner-report', '/today', '/week'] },
  { id: 'properties', label: 'Properties', href: '/my-properties', match: ['/my-properties', '/add-property'] },
  {
    id: 'requests',
    label: 'Requests',
    href: '/owner-requests',
    match: ['/owner-requests', '/visit-list', '/booking-requests', '/enquiries', '/maintenance', '/leave', '/announcements', '/stay-reviews'],
  },
  { id: 'ledger', label: 'Ledger', href: '/owner-ledger', match: ['/owner-ledger', '/expenses'] },
  { id: 'profile', label: 'Profile', href: '/owner-profile', match: ['/owner-profile', '/notifications'] },
];

const adminTabs: TabItem[] = [
  { id: 'home', label: 'Home', href: '/admin-home', match: ['/admin-home', '/today', '/week', '/notifications'] },
  { id: 'owners', label: 'Owners', href: '/admin-owners', match: ['/admin-owners'] },
  { id: 'properties', label: 'Properties', href: '/admin-properties', match: ['/admin-properties'] },
  { id: 'reports', label: 'Reports', href: '/admin-reports', match: ['/admin-reports'] },
  { id: 'profile', label: 'Profile', href: '/account', match: ['/account'] },
];

export function screenPath(pathname: string) {
  const path = pathname.split('?')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

export function tabsVisible(pathname: string) {
  const path = screenPath(pathname);
  return path !== '/' && !path.startsWith('/property/');
}

export function tabsForRole(role: AppRole | null, signedIn: boolean) {
  if (!signedIn) {
    return guestTabs;
  }
  if (role === 'owner') {
    return ownerTabs;
  }
  if (role === 'admin') {
    return adminTabs;
  }
  if (role === 'resident') {
    return residentTabs;
  }
  return [];
}

export function activeTabId(tabs: TabItem[], pathname: string) {
  const path = screenPath(pathname);
  return tabs.find((tab) => tab.match.some((item) => path === item || path.startsWith(`${item}/`)))?.id ?? '';
}
