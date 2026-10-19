import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>J3</Text>
        </View>

        <Text style={styles.brand}>J3cluster</Text>
        <Text style={styles.subtitle}>HOTEL MANAGEMENT</Text>

        <View style={styles.hero}>
          <Text style={styles.emoji}>🏨</Text>
          <Text style={styles.title}>Find Your Perfect Stay</Text>
          <Text style={styles.description}>
            Discover comfortable PGs, hostels and hotels that feel like home.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/explore')}>
          <Text style={styles.primaryButtonText}>Find a Stay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/owner-login')}>
          <Text style={styles.secondaryButtonText}>Owner Login</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Your stay, made simple.</Text>
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
    paddingBottom: BottomTabInset + 24,
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
    fontSize: 29,
    fontWeight: '800',
    color: '#172B4D',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#175CD3',
    marginTop: 5,
  },
  hero: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 36,
  },
  emoji: {
    fontSize: 66,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172B4D',
    textAlign: 'center',
  },
  description: {
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
  footer: {
    color: '#98A2B3',
    fontSize: 13,
    marginTop: 28,
  },
});
