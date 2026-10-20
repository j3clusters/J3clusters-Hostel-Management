import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
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

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ propertyId?: string; action?: string }>();
  const propertyId = Array.isArray(params.propertyId) ? params.propertyId[0] : params.propertyId;
  const action = Array.isArray(params.action) ? params.action[0] : params.action;
  const { configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signUp() {
    if (!supabase) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setMessage('Check your email and confirm the account, then come back and sign in.');
      return;
    }

    if (propertyId && action === 'save') {
      router.replace(`/property/${propertyId}?action=save` as Href);
      return;
    }

    router.replace('/');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {configured ? (
          <>
            <AppText variant="eyebrow">J3cluster</AppText>
            <AppText variant="title">Create an account</AppText>
            <AppText variant="body">This creates a resident account. It does not make you an owner or an admin.</AppText>
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
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            {message ? <AppText variant="body">{message}</AppText> : null}
            <AppButton
              label={submitting ? 'Creating account...' : 'Create account'}
              disabled={submitting}
              onPress={() => void signUp()}
            />
            <AppButton
              label="I already have an account"
              variant="secondary"
              onPress={() =>
                router.replace(
                  propertyId && action === 'save'
                    ? (`/sign-in?propertyId=${propertyId}&action=save` as Href)
                    : '/sign-in',
                )
              }
            />
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
