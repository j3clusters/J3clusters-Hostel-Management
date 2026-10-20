import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Brand, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const bucket = 'profile-photos';

type Props = {
  userId: string;
  name: string;
  onError: (message: string) => void;
};

function photoPath(userId: string) {
  return `${userId}/avatar`;
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return letters || 'J3';
}

export function ProfilePhoto({ userId, name, onError }: Props) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.storage
      .from(bucket)
      .createSignedUrl(photoPath(userId), 60 * 30)
      .then(({ data, error }) => {
        if (!active || error || !data?.signedUrl) {
          return;
        }
        setPhotoUrl(data.signedUrl);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  async function changePhoto() {
    if (!supabase || uploading) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError('Allow photo access to set your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      onError('Choose an image file.');
      return;
    }

    setUploading(true);
    onError('');
    const file = await fetch(asset.uri);
    const body = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from(bucket).upload(photoPath(userId), body, {
      contentType,
      upsert: true,
    });

    if (uploadError) {
      setUploading(false);
      onError(uploadError.message);
      return;
    }

    const { data, error: urlError } = await supabase.storage.from(bucket).createSignedUrl(photoPath(userId), 60 * 30);
    setUploading(false);
    if (urlError || !data?.signedUrl) {
      onError(urlError?.message || 'The photo was saved, but it could not be shown yet.');
      return;
    }

    setPhotoUrl(data.signedUrl);
  }

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} contentFit="cover" accessibilityLabel="Profile photo" />
        ) : (
          <AppText variant="body" style={styles.initials}>
            {initials(name)}
          </AppText>
        )}
        {uploading ? <ActivityIndicator style={styles.spinner} color={Brand.white} /> : null}
      </View>
      <Pressable accessibilityRole="button" disabled={uploading} onPress={() => void changePhoto()}>
        <AppText variant="body" style={styles.action}>
          {uploading ? 'Uploading...' : photoUrl ? 'Change photo' : 'Add photo'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.text,
  },
  image: {
    width: 72,
    height: 72,
  },
  initials: {
    color: Brand.white,
    fontWeight: '800',
  },
  spinner: {
    position: 'absolute',
  },
  action: {
    color: Brand.primary,
    fontWeight: '700',
  },
});
