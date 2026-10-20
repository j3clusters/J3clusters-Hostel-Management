import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { RoleTabBar } from '@/components/navigation/role-tab-bar';
import { Brand } from '@/constants/theme';
import { AuthProvider } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
      <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: Brand.primary,
          headerStyle: { backgroundColor: Brand.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: Brand.text },
          contentStyle: { backgroundColor: Brand.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="find-a-stay" options={{ title: 'Find a Stay', headerShown: true }} />
        <Stack.Screen name="owner-login" options={{ title: 'Owner Login', headerShown: true }} />
        <Stack.Screen name="admin-owners" options={{ title: 'Owner requests', headerShown: true }} />
        <Stack.Screen name="admin-properties" options={{ title: 'Property reviews', headerShown: true }} />
        <Stack.Screen name="admin-reports" options={{ title: 'Reports', headerShown: true }} />
        <Stack.Screen name="add-property" options={{ title: 'Add a property', headerShown: true }} />
        <Stack.Screen name="my-properties" options={{ title: 'My properties', headerShown: true }} />
        <Stack.Screen name="owner-report" options={{ title: 'Home', headerShown: true }} />
        <Stack.Screen name="expenses" options={{ title: 'Expenses', headerShown: true }} />
        <Stack.Screen name="maintenance" options={{ title: 'Maintenance', headerShown: true }} />
        <Stack.Screen name="leave" options={{ title: 'Leave', headerShown: true }} />
        <Stack.Screen name="announcements" options={{ title: 'Notices', headerShown: true }} />
        <Stack.Screen name="stay-reviews" options={{ title: 'Stay reviews', headerShown: true }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications', headerShown: true }} />
        <Stack.Screen name="property/[id]" options={{ title: 'Stay details', headerShown: true }} />
        <Stack.Screen name="saved-stays" options={{ title: 'Saved stays', headerShown: true }} />
        <Stack.Screen name="today" options={{ title: 'Today', headerShown: true }} />
        <Stack.Screen name="week" options={{ title: 'This week', headerShown: true }} />
        <Stack.Screen name="visit-list" options={{ title: 'Visit list', headerShown: true }} />
        <Stack.Screen name="enquiries" options={{ title: 'Enquiries', headerShown: true }} />
        <Stack.Screen name="booking-requests" options={{ title: 'Booking requests', headerShown: true }} />
        <Stack.Screen name="resident-profile" options={{ title: 'Resident profile', headerShown: true }} />
        <Stack.Screen name="resident-report" options={{ title: 'My stay', headerShown: true }} />
        <Stack.Screen name="activity" options={{ title: 'Activity', headerShown: true }} />
        <Stack.Screen name="owner-requests" options={{ title: 'Requests', headerShown: true }} />
        <Stack.Screen name="owner-ledger" options={{ title: 'Ledger', headerShown: true }} />
        <Stack.Screen name="admin-home" options={{ title: 'Home', headerShown: true }} />
        <Stack.Screen name="account" options={{ title: 'Account', headerShown: true }} />
        <Stack.Screen name="owner-profile" options={{ title: 'Owner profile', headerShown: true }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerShown: true }} />
        <Stack.Screen name="sign-up" options={{ title: 'Create account', headerShown: true }} />
        <Stack.Screen name="reset-password" options={{ title: 'Reset password', headerShown: true }} />
      </Stack>
      <RoleTabBar />
      </View>
      </AuthProvider>
    </ThemeProvider>
  );
}
