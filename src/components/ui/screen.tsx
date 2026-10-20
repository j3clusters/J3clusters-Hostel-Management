import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { tabsVisible } from '@/lib/navigation';

type Props = {
  children: ReactNode;
  centered?: boolean;
  edges?: Edge[];
};

export function Screen({ children, centered = false, edges = ['top', 'left', 'right', 'bottom'] }: Props) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabSpace = tabsVisible(pathname) ? 64 + insets.bottom : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <ScrollView
        contentContainerStyle={[styles.content, centered && styles.centered, { paddingBottom: Spacing.five + tabSpace }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: Spacing.four,
  },
  centered: {
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
});
