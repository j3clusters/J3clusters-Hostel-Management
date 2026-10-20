import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProfilePhoto } from '@/components/profile-photo';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { blankToNull, completionLabel, phoneDigits } from '@/lib/profile-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const occupations = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
] as const;

type Occupation = (typeof occupations)[number]['value'];

function isOccupation(value: string | null): value is Occupation {
  return occupations.some((item) => item.value === value);
}

export default function ResidentProfileScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(user ? '' : 'Sign in to edit your resident profile.');
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState<Occupation | ''>('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    let active = true;
    void supabase
      .from('resident_profiles')
      .select('full_name, country_code, phone, city, address, occupation_status, organization_name, job_title')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else if (data) {
          setFullName(data.full_name ?? '');
          setCountryCode(data.country_code ?? '+91');
          setPhone(data.phone ?? '');
          setCity(data.city ?? '');
          setAddress(data.address ?? '');
          setOccupation(isOccupation(data.occupation_status) ? data.occupation_status : '');
          setOrganization(data.organization_name ?? '');
          setJobTitle(data.job_title ?? '');
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const filled = [fullName, phone, city, occupation].filter((value) => value.trim().length > 0).length;

  async function saveProfile() {
    if (!supabase || !user) {
      return;
    }
    if (fullName.trim().length < 2) {
      setError('Enter your full name.');
      setStep(1);
      return;
    }
    if (phone.trim().length > 0 && phoneDigits(phone).length < 10) {
      setError('Enter a mobile number with at least 10 digits, or leave it blank.');
      setStep(1);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const { error: saveError } = await supabase.from('resident_profiles').upsert(
      {
        user_id: user.id,
        full_name: blankToNull(fullName),
        country_code: blankToNull(countryCode),
        phone: blankToNull(phone),
        city: blankToNull(city),
        address: blankToNull(address),
        occupation_status: occupation || null,
        organization_name: blankToNull(organization),
        job_title: blankToNull(jobTitle),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage('Resident profile saved. Only you can see these details.');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Resident profile</AppText>
        <StatusBadge label={completionLabel(filled, 4)} />
        <AppText variant="body">{user?.email}</AppText>
        {user ? <ProfilePhoto userId={user.id} name={fullName || user.email || 'Resident'} onError={setError} /> : null}
        {loading ? (
          <AppText variant="body">Loading profile...</AppText>
        ) : step === 1 ? (
          <>
            <AppText variant="body" style={styles.heading}>
              Personal information
            </AppText>
            <AppTextField label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <AppTextField label="Country code" value={countryCode} onChangeText={setCountryCode} />
            <AppTextField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <AppTextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
            <AppTextField label="Current address" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
            <AppButton label="Next" onPress={() => setStep(2)} />
          </>
        ) : (
          <>
            <AppText variant="body" style={styles.heading}>
              Work
            </AppText>
            <View style={styles.choices}>
              {occupations.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: occupation === item.value }}
                  onPress={() => setOccupation(item.value)}
                  style={[styles.choice, occupation === item.value && styles.choiceSelected]}>
                  <AppText variant="body" style={occupation === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppTextField
              label="Company or organization"
              value={organization}
              onChangeText={setOrganization}
              autoCapitalize="words"
            />
            <AppTextField label="Job title" value={jobTitle} onChangeText={setJobTitle} autoCapitalize="words" />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            {message ? <AppText variant="body">{message}</AppText> : null}
            <AppButton label={saving ? 'Saving...' : 'Save profile'} disabled={saving} onPress={() => void saveProfile()} />
            <AppButton label="Back" variant="secondary" onPress={() => setStep(1)} />
          </>
        )}
        {step === 1 && error ? <AppText style={styles.error}>{error}</AppText> : null}
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
  heading: {
    color: Brand.text,
    fontWeight: '800',
  },
  choices: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.white,
  },
  choiceSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  choiceLabel: {
    color: Brand.text,
    fontWeight: '700',
  },
  choiceSelectedLabel: {
    color: Brand.white,
    fontWeight: '700',
  },
  error: {
    color: Brand.danger,
  },
});
