import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logo} accessibilityRole="image" accessibilityLabel="J3cluster">
          <Text style={styles.logoText}>J3</Text>
        </View>

        <Text style={styles.brand}>J3cluster</Text>
        <Text style={styles.subtitle}>Hotel Management</Text>

        <View style={styles.hero}>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.tagline}>Find a Stay. Manage a Stay. Live Better.</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          accessibilityRole="button"
          onPress={() => router.push('/find-a-stay')}>
          <Text style={styles.primaryButtonText}>Find a Stay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          accessibilityRole="button"
          onPress={() => router.push('/owner-login')}>
          <Text style={styles.secondaryButtonText}>Owner Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#175CD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#172B4D',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#175CD3',
    marginTop: 6,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172B4D',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 25,
    marginTop: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#175CD3',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#175CD3',
    marginTop: 14,
  },
  secondaryButtonText: {
    color: '#175CD3',
    fontSize: 16,
    fontWeight: '700',
  },
});
