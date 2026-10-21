import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SuccessIllustration } from '@/components/illustrations/brand-illustrations';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Screen } from '@/components/ui/screen';
import { propertyCategories, type PropertyCategory } from '@/constants/property';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { uploadPropertyCover } from '@/lib/property-photos';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function AddPropertyScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PropertyCategory>('pg');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [rent, setRent] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function submitProperty() {
    if (!supabase || !user) {
      return;
    }

    const monthlyRent = Number(rent);
    if (
      name.trim().length < 2 ||
      city.trim().length < 2 ||
      locality.trim().length < 2 ||
      address.trim().length < 5 ||
      description.trim().length < 10
    ) {
      setError('Enter the name, city, locality, address, and a short description.');
      return;
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      setError('Enter a monthly rent greater than 0.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    const { data, error: insertError } = await supabase
      .from('properties')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        category,
        city: city.trim(),
        locality: locality.trim(),
        address: address.trim(),
        description: description.trim(),
        monthly_rent: monthlyRent,
        currency: 'INR',
        status: 'pending',
      })
      .select('id')
      .single();
    setSubmitting(false);

    if (insertError || !data) {
      setError(insertError?.message || 'The property could not be submitted.');
      return;
    }

    setCreatedId(data.id);
    setMessage('Submitted for review. It will not appear in Find a Stay until an administrator approves it.');
  }

  async function addCoverPhoto() {
    if (!createdId || uploadingPhoto) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    setUploadingPhoto(true);
    setError('');
    const uploadError = await uploadPropertyCover(
      createdId,
      result.assets[0].uri,
      result.assets[0].mimeType ?? 'image/jpeg',
    );
    setUploadingPhoto(false);

    if (uploadError) {
      setError(uploadError);
      return;
    }

    setMessage('Cover photo saved. Visitors will see it after an administrator approves the stay.');
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
            <AppText variant="body">The listing stays hidden until an administrator approves it. House rules can be added from My properties after you submit.</AppText>
            <View style={styles.section}>
              <AppText variant="section">Basic details</AppText>
              <AppTextField label="Property name" value={name} onChangeText={setName} autoCapitalize="words" />
              <AppText variant="caption">Category</AppText>
              <View style={styles.choices}>
                {propertyCategories.map((item) => {
                  const selected = category === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setCategory(item.value)}
                      style={[styles.choice, selected && styles.choiceSelected]}>
                      <AppText variant="body" style={selected ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {item.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.section}>
              <AppText variant="section">Location</AppText>
              <AppTextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
              <AppTextField label="Locality" value={locality} onChangeText={setLocality} autoCapitalize="words" />
              <AppTextField label="Address" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
            </View>
            <View style={styles.section}>
              <AppText variant="section">Description</AppText>
              <AppTextField
                label="Description"
                value={description}
                onChangeText={setDescription}
                autoCapitalize="sentences"
                multiline
              />
            </View>
            <View style={styles.section}>
              <AppText variant="section">Rent</AppText>
              <AppText variant="caption">Monthly rent in rupees. Submitting does not take a payment.</AppText>
              <AppTextField label="Monthly rent in INR" value={rent} onChangeText={setRent} keyboardType="decimal-pad" />
            </View>
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            {createdId ? (
              <View style={styles.section}>
                <SuccessIllustration />
                <AppText variant="section">Cover photo</AppText>
                <AppText variant="body">{message}</AppText>
                <AppButton
                  label={uploadingPhoto ? 'Uploading...' : 'Add cover photo'}
                  disabled={uploadingPhoto}
                  onPress={() => void addCoverPhoto()}
                />
              </View>
            ) : (
              <>
                {message ? <AppText variant="body">{message}</AppText> : null}
                <AppButton
                  label={submitting ? 'Submitting...' : 'Submit for review'}
                  disabled={submitting}
                  onPress={() => void submitProperty()}
                />
              </>
            )}
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
  section: {
    width: '100%',
    gap: Spacing.two,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    ...Shadow.card,
  },
  choices: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    minHeight: 44,
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
