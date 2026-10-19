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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { configured } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function sendReset() {
    if (!supabase) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setError('Enter the email address on the account.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('If that email has an account, Supabase will send a reset message.');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {configured ? (
          <>
            <AppText variant="eyebrow">J3cluster</AppText>
            <AppText variant="title">Reset password</AppText>
            <AppText variant="body">Enter your email. The reset link is sent by Supabase.</AppText>
            <AppTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            {message ? <AppText variant="body">{message}</AppText> : null}
            <AppButton
              label={submitting ? 'Sending...' : 'Send reset email'}
              disabled={submitting}
              onPress={() => void sendReset()}
            />
            <AppButton label="Back to sign in" variant="secondary" onPress={() => router.replace('/sign-in')} />
          </>
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
