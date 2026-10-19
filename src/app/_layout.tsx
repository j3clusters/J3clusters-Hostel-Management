import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Brand } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
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
      </Stack>
    </ThemeProvider>
  );
}
