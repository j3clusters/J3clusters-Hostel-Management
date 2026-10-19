import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Screen } from '@/components/ui/screen';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const categories = [
  { value: 'pg', label: 'PG' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'guest_house', label: 'Guest house' },
] as const;

type Category = (typeof categories)[number]['value'];

export default function AddPropertyScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('pg');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [rent, setRent] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitProperty() {
    if (!supabase || !user) {
      return;
    }

    const monthlyRent = Number(rent);
    if (name.trim().length < 2 || city.trim().length < 2 || locality.trim().length < 2) {
      setError('Enter the property name, city, and locality.');
      return;
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      setError('Enter a monthly rent greater than 0.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    const { error: insertError } = await supabase.from('properties').insert({
      owner_id: user.id,
      name: name.trim(),
      category,
      city: city.trim(),
      locality: locality.trim(),
      monthly_rent: monthlyRent,
      currency: 'INR',
      status: 'pending',
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage('Submitted for review. It will not appear in Find a Stay until an administrator approves it.');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Add a property</AppText>
        {role !== 'owner' ? (
          <>
            <AppText variant="body">
              Only an approved owner can add a property. A resident request does not open this form.
            </AppText>
            <AppButton label="Back to welcome" variant="secondary" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <AppText variant="body">The listing stays hidden until an administrator approves it.</AppText>
            <AppTextField label="Property name" value={name} onChangeText={setName} autoCapitalize="words" />
            <AppText variant="body">Category</AppText>
            {categories.map((item) => (
              <AppButton
                key={item.value}
                label={item.label}
                variant={category === item.value ? 'primary' : 'secondary'}
                onPress={() => setCategory(item.value)}
              />
            ))}
            <AppTextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
            <AppTextField label="Locality" value={locality} onChangeText={setLocality} autoCapitalize="words" />
            <AppTextField label="Monthly rent in INR" value={rent} onChangeText={setRent} keyboardType="decimal-pad" />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            {message ? <AppText variant="body">{message}</AppText> : null}
            <AppButton
              label={submitting ? 'Submitting...' : 'Submit for review'}
              disabled={submitting}
              onPress={() => void submitProperty()}
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
