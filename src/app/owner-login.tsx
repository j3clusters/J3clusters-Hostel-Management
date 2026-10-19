import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type OwnerRequest = {
  full_name: string;
  phone: string;
  business_name: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
};

const statusLabel = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export default function OwnerLoginScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState<OwnerRequest | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    let active = true;

    void supabase
      .from('owner_verifications')
      .select('full_name, phone, business_name, city, status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else if (data && (data.status === 'pending' || data.status === 'approved' || data.status === 'rejected')) {
          setRequest(data);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function submitRequest() {
    if (!supabase || !user) {
      return;
    }

    const nextRequest = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      business_name: businessName.trim(),
      city: city.trim(),
    };
    const digits = nextRequest.phone.replace(/\D/g, '');

    if (nextRequest.full_name.length < 2 || nextRequest.business_name.length < 2 || nextRequest.city.length < 2) {
      setError('Enter your name, business name, and city.');
      return;
    }
    if (digits.length < 10) {
      setError('Enter a phone number with at least 10 digits.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('owner_verifications')
      .insert({
        user_id: user.id,
        ...nextRequest,
        status: 'pending',
      })
      .select('full_name, phone, business_name, city, status')
      .single();
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data.status === 'pending' || data.status === 'approved' || data.status === 'rejected') {
      setRequest(data);
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Owner request</AppText>
        {!user ? (
          <>
            <AppText variant="body">Sign in with your resident account before you ask for owner access.</AppText>
            <AppButton label="Sign in" onPress={() => router.push('/sign-in')} />
          </>
        ) : loading ? (
          <AppText variant="body">Loading your request...</AppText>
        ) : request ? (
          <>
            <StatusBadge label={statusLabel[request.status]} />
            <AppText variant="body">
              {request.business_name} in {request.city}. {request.full_name}, {request.phone}.
            </AppText>
            <AppText variant="body">
              {request.status === 'pending'
                ? 'An administrator still has to approve this request. It does not make you an owner yet.'
                : request.status === 'approved'
                  ? 'The request was approved. Owner tools are not open yet.'
                  : 'This request was rejected. It did not change your account role.'}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="body">
              Send your details for review. Submitting this form keeps your account as a resident.
            </AppText>
            <AppTextField label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <AppTextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <AppTextField
              label="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
            />
            <AppTextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <AppButton
              label={submitting ? 'Sending...' : 'Submit request'}
              disabled={submitting}
              onPress={() => void submitRequest()}
            />
          </>
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
