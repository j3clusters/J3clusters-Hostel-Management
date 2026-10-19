import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';

export default function OwnerLoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>J3cluster</Text>
        <Text style={styles.title}>Owner Login</Text>
        <Text style={styles.description}>
          Owner sign-in is the next step. Accounts are not connected yet, so this screen only
          confirms navigation from the welcome screen.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back to welcome</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#175CD3',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#172B4D',
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: '#667085',
    marginTop: 12,
  },
  button: {
    marginTop: 28,
    backgroundColor: '#175CD3',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
