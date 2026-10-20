import { type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

export type HubLink = {
  label: string;
  href: Href;
  variant?: 'primary' | 'secondary';
};

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  links: HubLink[];
};

export function HubScreen({ eyebrow, title, body, links }: Props) {
  const router = useRouter();

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">{eyebrow}</AppText>
        <AppText variant="title">{title}</AppText>
        <AppText variant="body">{body}</AppText>
        {links.map((link) => (
          <AppButton key={link.label} label={link.label} variant={link.variant ?? 'secondary'} onPress={() => router.push(link.href)} />
        ))}
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
});
