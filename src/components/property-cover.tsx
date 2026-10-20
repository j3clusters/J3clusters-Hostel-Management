import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { PropertyPhotoPlaceholder } from '@/components/property-photo-placeholder';
import { supabase } from '@/lib/supabase';

type Props = {
  label: string;
  coverPath: string | null;
};

export function PropertyCover({ label, coverPath }: Props) {
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (!supabase || !coverPath) {
      return;
    }

    let active = true;
    void supabase.storage
      .from('property-photos')
      .createSignedUrl(coverPath, 60 * 30)
      .then(({ data, error }) => {
        if (!active || error || !data?.signedUrl) {
          return;
        }
        setPhotoUrl(data.signedUrl);
      });

    return () => {
      active = false;
    };
  }, [coverPath]);

  if (!photoUrl) {
    return <PropertyPhotoPlaceholder label={label} />;
  }

  return (
    <Image
      source={{ uri: photoUrl }}
      style={styles.image}
      contentFit="cover"
      accessibilityLabel={`${label} cover photo`}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1.6,
  },
});
