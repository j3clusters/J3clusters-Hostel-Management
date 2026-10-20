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

type Mode = 'choose' | 'create' | 'login';

export default function OwnerLoginScreen() {
  const router = useRouter();
  const { configured, user, role, reloadRole } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function openOwnerAccount() {
    if (!supabase) {
      return;
    }

    const { error: openError } = await supabase.rpc('open_owner_account');
    if (openError) {
      setError(openError.message);
      return false;
    }

    await reloadRole();
    router.replace('/');
    return true;
  }

  async function createAccount() {
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
      options: { data: { account_type: 'owner' } },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setMessage('Check your email and confirm the account, then use Login.');
      return;
    }

    await openOwnerAccount();
  }

  async function login() {
    if (!supabase) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@') || password.length === 0) {
      setError('Enter the email and password for this owner account.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    await openOwnerAccount();
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {configured ? (
          <>
            <AppText variant="eyebrow">J3cluster</AppText>
            <AppText variant="title">Owner Login</AppText>
            {user && role === 'admin' ? (
              <AppText variant="body">
                This account is the administrator. Sign out on the welcome screen before creating an owner account.
              </AppText>
            ) : user && role === 'owner' ? (
              <>
                <AppText variant="body">Signed in as {user.email}</AppText>
                <AppText variant="body">This is an owner account.</AppText>
                <AppButton label="Add a property" onPress={() => router.replace('/add-property')} />
              </>
            ) : user ? (
              <>
                <AppText variant="body">Signed in as {user.email}</AppText>
                <AppButton
                  label={submitting ? 'Opening...' : 'Use this account'}
                  disabled={submitting}
                  onPress={() => {
                    setSubmitting(true);
                    void openOwnerAccount().finally(() => setSubmitting(false));
                  }}
                />
                <AppButton
                  label="Sign out"
                  variant="secondary"
                  disabled={submitting}
                  onPress={() => {
                    void supabase?.auth.signOut();
                  }}
                />
              </>
            ) : mode === 'choose' ? (
              <>
                <AppButton label="Create account" onPress={() => setMode('create')} />
                <AppButton label="Login" variant="secondary" onPress={() => setMode('login')} />
              </>
            ) : (
              <>
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
                  autoComplete={mode === 'create' ? 'new-password' : 'password'}
                  textContentType={mode === 'create' ? 'newPassword' : 'password'}
                />
                {error ? <AppText style={styles.error}>{error}</AppText> : null}
                {message ? <AppText variant="body">{message}</AppText> : null}
                <AppButton
                  label={
                    submitting ? (mode === 'create' ? 'Creating account...' : 'Signing in...') : mode === 'create' ? 'Create account' : 'Login'
                  }
                  disabled={submitting}
                  onPress={() => void (mode === 'create' ? createAccount() : login())}
                />
                <AppButton
                  label={mode === 'create' ? 'Login' : 'Create account'}
                  variant="secondary"
                  disabled={submitting}
                  onPress={() => {
                    setError('');
                    setMessage('');
                    setMode(mode === 'create' ? 'login' : 'create');
                  }}
                />
              </>
            )}
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
