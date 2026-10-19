import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SupabaseSetupNotice } from '@/components/supabase-setup-notice';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const router = useRouter();
  const { configured, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signIn() {
    if (!supabase) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@') || password.length === 0) {
      setError('Enter the email and password for your account.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/');
  }

  async function signOut() {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    await supabase.auth.signOut();
    setSubmitting(false);
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {configured ? (
          user ? (
            <>
              <AppText variant="title">You are signed in</AppText>
              <AppText variant="body">{user.email}</AppText>
              <AppButton label="Sign out" disabled={submitting} onPress={() => void signOut()} />
            </>
          ) : (
            <>
              <AppText variant="eyebrow">J3cluster</AppText>
              <AppText variant="title">Sign in</AppText>
              <AppText variant="body">Use the email and password for your resident account.</AppText>
              <AppTextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <AppTextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <AppButton label={submitting ? 'Signing in...' : 'Sign in'} disabled={submitting} onPress={() => void signIn()} />
              <AppButton label="Create an account" variant="secondary" onPress={() => router.push('/sign-up')} />
              <AppButton label="Forgot password" variant="secondary" onPress={() => router.push('/reset-password')} />
            </>
          )
        ) : (
          <SupabaseSetupNotice />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  error: {
    color: Brand.danger,
  },
});
