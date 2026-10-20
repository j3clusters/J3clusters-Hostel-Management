import { Modal, Pressable, StyleSheet } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Brand, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onContinueWithEmail: () => void;
  onLater: () => void;
};

export function SaveStayPrompt({ visible, onContinueWithEmail, onLater }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <Pressable style={styles.backdrop} onPress={onLater}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title" style={styles.title}>
            Save your favourite stays
          </AppText>
          <AppText variant="body">
            Sign in to save properties, manage your visit list, and keep track of your booking enquiries.
          </AppText>
          <AppButton label="Continue with Email" onPress={onContinueWithEmail} />
          <AppButton label="Maybe Later" variant="secondary" onPress={onLater} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 43, 77, 0.45)',
    padding: Spacing.three,
  },
  sheet: {
    width: '100%',
    gap: Spacing.three,
    backgroundColor: Brand.white,
    borderRadius: Radius.card,
    padding: Spacing.four,
  },
  title: {
    fontSize: 26,
  },
});
