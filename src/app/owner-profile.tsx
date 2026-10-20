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

const employmentOptions = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'business_owner', label: 'Business owner' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'other', label: 'Other' },
] as const;

type Employment = (typeof employmentOptions)[number]['value'];

function isEmployment(value: string | null): value is Employment {
  return employmentOptions.some((item) => item.value === value);
}

export default function OwnerProfileScreen() {
  const { user, role } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(user ? '' : 'Sign in to edit your owner profile.');
  const [message, setMessage] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [employment, setEmployment] = useState<Employment | ''>('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [propertiesManaged, setPropertiesManaged] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    let active = true;
    void Promise.all([
      supabase
        .from('owner_profiles')
        .select(
          'full_name, country_code, phone, city, address, employment_status, company_name, job_title, business_display_name, properties_managed, business_address',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('owner_verifications').select('status').eq('user_id', user.id).maybeSingle(),
    ]).then(([profileResult, reviewResult]) => {
      if (!active) {
        return;
      }
      if (profileResult.error) {
        setError(profileResult.error.message);
      } else if (profileResult.data) {
        const data = profileResult.data;
        setFullName(data.full_name ?? '');
        setCountryCode(data.country_code ?? '+91');
        setPhone(data.phone ?? '');
        setCity(data.city ?? '');
        setAddress(data.address ?? '');
        setEmployment(isEmployment(data.employment_status) ? data.employment_status : '');
        setCompanyName(data.company_name ?? '');
        setJobTitle(data.job_title ?? '');
        setDisplayName(data.business_display_name ?? '');
        setPropertiesManaged(data.properties_managed === null ? '' : String(data.properties_managed));
        setBusinessAddress(data.business_address ?? '');
      }
      if (reviewResult.data?.status) {
        setReviewStatus(reviewResult.data.status);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const filled = [fullName, phone, city, displayName].filter((value) => value.trim().length > 0).length;

  async function saveProfile() {
    if (!supabase || !user) {
      return;
    }
    if (fullName.trim().length < 2) {
      setError('Enter your full legal name.');
      setStep(1);
      return;
    }
    if (phone.trim().length > 0 && phoneDigits(phone).length < 10) {
      setError('Enter a mobile number with at least 10 digits, or leave it blank.');
      setStep(1);
      return;
    }

    const managed = propertiesManaged.trim();
    const managedCount = managed.length === 0 ? null : Number(managed);
    if (managedCount !== null && (!Number.isInteger(managedCount) || managedCount < 0)) {
      setError('Enter the number of properties as a whole number, or leave it blank.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const { error: saveError } = await supabase.from('owner_profiles').upsert(
      {
        user_id: user.id,
        full_name: blankToNull(fullName),
        country_code: blankToNull(countryCode),
        phone: blankToNull(phone),
        city: blankToNull(city),
        address: blankToNull(address),
        employment_status: employment || null,
        company_name: blankToNull(companyName),
        job_title: blankToNull(jobTitle),
        business_display_name: blankToNull(displayName),
        properties_managed: managedCount,
        business_address: blankToNull(businessAddress),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    const businessName = displayName.trim() || companyName.trim();
    const canRequest =
      role !== 'owner' &&
      role !== 'admin' &&
      fullName.trim().length >= 2 &&
      phoneDigits(phone).length >= 10 &&
      businessName.length >= 2 &&
      city.trim().length >= 2 &&
      !reviewStatus;

    if (canRequest) {
      const { error: requestError } = await supabase.from('owner_verifications').insert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: `${countryCode.trim()} ${phone.trim()}`.trim(),
        business_name: businessName,
        city: city.trim(),
        status: 'pending',
      });
      if (requestError && requestError.code !== '23505') {
        setSaving(false);
        setError(requestError.message);
        return;
      }
      setReviewStatus('pending');
    }

    setSaving(false);
    setMessage(
      role === 'owner'
        ? 'Owner profile saved. Only you can see these details.'
        : 'Profile saved. An administrator still has to approve owner access.',
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Owner profile</AppText>
        <StatusBadge label={completionLabel(filled, 4)} />
        {reviewStatus ? <StatusBadge label={`Owner review ${reviewStatus}`} /> : null}
        <AppText variant="body">{user?.email}</AppText>
        {user ? <ProfilePhoto userId={user.id} name={fullName || user.email || 'Owner'} onError={setError} /> : null}
        <AppText variant="body">Saving this form does not make the account an owner. Identity documents are not collected.</AppText>
        {loading ? (
          <AppText variant="body">Loading profile...</AppText>
        ) : step === 1 ? (
          <>
            <AppText variant="body" style={styles.heading}>
              Personal information
            </AppText>
            <AppTextField label="Full legal name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            <AppTextField label="Country code" value={countryCode} onChangeText={setCountryCode} />
            <AppTextField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <AppTextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
            <AppTextField label="Current address" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
            <AppButton label="Next" onPress={() => setStep(2)} />
          </>
        ) : (
          <>
            <AppText variant="body" style={styles.heading}>
              Business
            </AppText>
            <View style={styles.choices}>
              {employmentOptions.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: employment === item.value }}
                  onPress={() => setEmployment(item.value)}
                  style={[styles.choice, employment === item.value && styles.choiceSelected]}>
                  <AppText
                    variant="body"
                    style={employment === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppTextField label="Company or business name" value={companyName} onChangeText={setCompanyName} autoCapitalize="words" />
            <AppTextField label="Job title" value={jobTitle} onChangeText={setJobTitle} autoCapitalize="words" />
            <AppTextField
              label="Owner display name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
            <AppTextField
              label="Properties managed"
              value={propertiesManaged}
              onChangeText={setPropertiesManaged}
              keyboardType="number-pad"
            />
            <AppTextField
              label="Business address"
              value={businessAddress}
              onChangeText={setBusinessAddress}
              autoCapitalize="sentences"
            />
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
