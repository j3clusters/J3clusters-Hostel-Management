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
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  const [failedPath, setFailedPath] = useState('');
  const photoUrl = photo?.path === coverPath ? photo.url : '';
  const failed = Boolean(coverPath) && failedPath === coverPath && !photoUrl;

  useEffect(() => {
    if (!supabase || !coverPath) {
      return;
    }

    let active = true;
    void supabase.storage
      .from('property-photos')
      .createSignedUrl(coverPath, 60 * 30)
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error || !data?.signedUrl) {
          setFailedPath(coverPath);
          return;
        }
        setPhoto({ path: coverPath, url: data.signedUrl });
      });

    return () => {
      active = false;
    };
  }, [coverPath]);

  if (!photoUrl || failed) {
    return <PropertyPhotoPlaceholder label={label} />;
  }

  return (
    <Image
      source={{ uri: photoUrl }}
      style={styles.image}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={200}
      onError={() => {
        if (coverPath) {
          setFailedPath(coverPath);
        }
      }}
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
