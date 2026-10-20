import { type Href, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Brand } from '@/constants/theme';
import { activeTabId, tabsForRole, tabsVisible } from '@/lib/navigation';
import { useAuth } from '@/providers/auth-provider';

export function RoleTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role, ready } = useAuth();

  if (!tabsVisible(pathname)) {
    return null;
  }

  const waitingForRole = Boolean(user) && ready && role === null;
  const tabs = waitingForRole ? [] : tabsForRole(role, Boolean(user));
  if (tabs.length === 0) {
    return null;
  }

  const active = activeTabId(tabs, pathname);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => router.push(tab.href as Href)}
            style={styles.item}>
            <TabIcon name={tab.id} color={selected ? Brand.primary : Brand.muted} />
            {selected ? <View style={styles.indicator} /> : <View style={styles.indicatorSpacer} />}
            <AppText variant="caption" style={selected ? styles.labelActive : styles.label}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  if (name === 'saved') {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Path d="M11 18s-6.5-3.8-6.5-8.2A3.4 3.4 0 0 1 11 7a3.4 3.4 0 0 1 6.5 2.8C17.5 14.2 11 18 11 18z" stroke={color} strokeWidth="1.7" fill="none" />
      </Svg>
    );
  }
  if (name === 'stay' || name === 'home' || name === 'properties') {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Path d="M4 10.5 11 4l7 6.5V18a1 1 0 0 1-1 1h-4.2v-4.2H9.2V19H5a1 1 0 0 1-1-1z" stroke={color} strokeWidth="1.7" fill="none" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === 'activity' || name === 'requests' || name === 'reports') {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Rect x="4" y="4" width="14" height="14" rx="3" stroke={color} strokeWidth="1.7" fill="none" />
        <Path d="M7 11h8M7 8h5M7 14h6" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'ledger') {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Rect x="4" y="3" width="14" height="16" rx="3" stroke={color} strokeWidth="1.7" fill="none" />
        <Path d="M8 8h6M8 11h6M8 14h4" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'owners') {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle cx="8" cy="8" r="2.4" stroke={color} strokeWidth="1.7" fill="none" />
        <Circle cx="14.5" cy="9" r="2" stroke={color} strokeWidth="1.7" fill="none" />
        <Path d="M4 17c.6-2.4 2.2-3.6 4-3.6s3.4 1.2 4 3.6M13 13.6c1.3.1 2.4.8 3 2.4" stroke={color} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }
  if (name === 'profile' || name === 'account') {
    return (
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle cx="11" cy="8" r="3" stroke={color} strokeWidth="1.7" fill="none" />
        <Path d="M5 18c1-3 2.8-4.4 6-4.4S16 15 17 18" stroke={color} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Circle cx="10" cy="10" r="5.5" stroke={color} strokeWidth="1.7" fill="none" />
      <Path d="M14.5 14.5 18 18" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderTopColor: Brand.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    width: 16,
    height: 3,
    borderRadius: 999,
    backgroundColor: Brand.primaryLight,
  },
  indicatorSpacer: {
    width: 16,
    height: 3,
  },
  label: {
    color: Brand.muted,
    fontWeight: '600',
  },
  labelActive: {
    color: Brand.primary,
    fontWeight: '700',
  },
});

