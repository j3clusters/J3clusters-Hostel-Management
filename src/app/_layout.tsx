import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Brand } from '@/constants/theme';
import { AuthProvider } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
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
        <Stack.Screen name="add-property" options={{ title: 'Add a property', headerShown: true }} />
        <Stack.Screen name="property/[id]" options={{ title: 'Stay details', headerShown: true }} />
        <Stack.Screen name="saved-stays" options={{ title: 'Saved stays', headerShown: true }} />
        <Stack.Screen name="visit-list" options={{ title: 'Visit list', headerShown: true }} />
        <Stack.Screen name="enquiries" options={{ title: 'Enquiries', headerShown: true }} />
        <Stack.Screen name="resident-profile" options={{ title: 'Resident profile', headerShown: true }} />
        <Stack.Screen name="owner-profile" options={{ title: 'Owner profile', headerShown: true }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerShown: true }} />
        <Stack.Screen name="sign-up" options={{ title: 'Create account', headerShown: true }} />
        <Stack.Screen name="reset-password" options={{ title: 'Reset password', headerShown: true }} />
      </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
