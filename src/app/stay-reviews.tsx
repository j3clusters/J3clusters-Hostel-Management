import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  loadMyStayReviews,
  loadOwnerStayReviews,
  loadStayReviewChoices,
  ratingLabel,
  stayReviewDateLabel,
  submitStayReview,
  replyToStayReview,
  type ReviewChoice,
  type StayReview,
} from '@/lib/stay-reviews';
import { useAuth } from '@/providers/auth-provider';

const ratings = [1, 2, 3, 4, 5] as const;

export default function StayReviewsScreen() {
  const { user, role } = useAuth();
  const canUse = role === 'owner' || role === 'resident';
  const [choices, setChoices] = useState<ReviewChoice[]>([]);
  const [reviews, setReviews] = useState<StayReview[]>([]);
  const [ratingByProperty, setRatingByProperty] = useState<Record<string, number>>({});
  const [noteByProperty, setNoteByProperty] = useState<Record<string, string>>({});
  const [replyByReview, setReplyByReview] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(canUse);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(!user ? 'Sign in to see stay reviews.' : canUse ? '' : 'Stay reviews are for residents and owners.');

  useFocusEffect(
    useCallback(() => {
      if (!user || !canUse) {
        return;
      }

      let active = true;
      const pending =
        role === 'owner'
          ? loadOwnerStayReviews().then((result) => ({ ...result, choices: [] as ReviewChoice[] }))
          : Promise.all([loadStayReviewChoices(), loadMyStayReviews()]).then(([choiceResult, reviewResult]) => ({
              error: choiceResult.error || reviewResult.error,
              reviews: reviewResult.reviews,
              choices: choiceResult.choices,
            }));

      void pending.then((result) => {
        if (!active) {
          return;
        }
        if (result.error) {
          setError(result.error);
        } else {
          setError('');
          setChoices(result.choices);
          setReviews(result.reviews);
        }
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [canUse, role, user]),
  );

  async function saveReview(choice: ReviewChoice) {
    const rating = ratingByProperty[choice.propertyId] ?? 0;
    const note = noteByProperty[choice.propertyId] ?? '';
    setBusyId(choice.propertyId);
    setError('');
    const result = await submitStayReview(choice.propertyId, rating, note);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setChoices((current) => current.filter((item) => item.propertyId !== choice.propertyId));
    setReviews((current) => [
      {
        id: '',
        propertyName: choice.propertyName,
        rating,
        note: note.trim(),
        createdAt: result.createdAt,
        ownerReply: null,
        repliedAt: null,
      },
      ...current,
    ]);
  }

  async function saveReply(review: StayReview) {
    const note = replyByReview[review.id] ?? '';
    setBusyId(review.id);
    setError('');
    const result = await replyToStayReview(review.id, note);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setReviews((current) =>
      current.map((item) =>
        item.id === review.id ? { ...item, ownerReply: note.trim(), repliedAt: result.repliedAt } : item,
      ),
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Stay reviews</AppText>
        <AppText variant="body">
          {role === 'owner'
            ? 'You can write one reply. It shows on the stay and does not change the rating. Names and phone numbers are not shown.'
            : 'You can review a stay after you check out. The rating, your note, and any owner reply are shown. Your name and phone are not.'}
        </AppText>
        {!canUse ? (
          <AppText variant="body">{error}</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && reviews.length === 0 && choices.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            {role === 'resident' && choices.length === 0 && reviews.length === 0 ? (
              <EmptyState title="No stay to review" message="Check out of a stay before writing a review." />
            ) : null}
            {choices.map((choice) => (
              <View key={choice.propertyId} style={styles.card}>
                <AppText variant="body" style={styles.name}>
                  {choice.propertyName}
                </AppText>
                <View style={styles.ratings}>
                  {ratings.map((value) => {
                    const selected = ratingByProperty[choice.propertyId] === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setRatingByProperty((current) => ({ ...current, [choice.propertyId]: value }))}
                        style={[styles.rating, selected && styles.ratingSelected]}>
                        <AppText variant="body" style={selected ? styles.ratingSelectedLabel : styles.ratingLabel}>
                          {value}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <AppTextField
                  label="How was the stay?"
                  value={noteByProperty[choice.propertyId] ?? ''}
                  onChangeText={(value) => setNoteByProperty((current) => ({ ...current, [choice.propertyId]: value }))}
                  autoCapitalize="sentences"
                  multiline
                />
                <AppButton
                  label={busyId === choice.propertyId ? 'Saving...' : 'Save review'}
                  disabled={busyId !== null}
                  onPress={() => void saveReview(choice)}
                />
              </View>
            ))}
            {role === 'owner' && reviews.length === 0 ? (
              <EmptyState title="No stay reviews" message="A review appears here after a resident checks out and writes one." />
            ) : null}
            {reviews.map((review) => (
              <View key={review.id || `${review.propertyName}-${review.createdAt}`} style={styles.card}>
                <AppText variant="body" style={styles.name}>
                  {review.propertyName}
                </AppText>
                <AppText variant="body">{ratingLabel(review.rating)}</AppText>
                <AppText variant="body">{review.note}</AppText>
                <AppText variant="body">{stayReviewDateLabel(review.createdAt)}</AppText>
                {review.ownerReply ? (
                  <>
                    <AppText variant="body" style={styles.name}>
                      Owner reply
                    </AppText>
                    <AppText variant="body">{review.ownerReply}</AppText>
                    {review.repliedAt ? <AppText variant="body">{stayReviewDateLabel(review.repliedAt)}</AppText> : null}
                  </>
                ) : role === 'owner' && review.id ? (
                  <>
                    <AppTextField
                      label="Reply"
                      value={replyByReview[review.id] ?? ''}
                      onChangeText={(value) => setReplyByReview((current) => ({ ...current, [review.id]: value }))}
                      autoCapitalize="sentences"
                      multiline
                    />
                    <AppButton
                      label={busyId === review.id ? 'Saving...' : 'Save reply'}
                      disabled={busyId !== null}
                      onPress={() => void saveReply(review)}
                    />
                  </>
                ) : null}
              </View>
            ))}
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
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
  card: {
    width: '100%',
    gap: Spacing.two,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  name: {
    color: Brand.text,
    fontWeight: '800',
  },
  ratings: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rating: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.white,
  },
  ratingSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  ratingLabel: {
    color: Brand.text,
    fontWeight: '700',
  },
  ratingSelectedLabel: {
    color: Brand.white,
    fontWeight: '700',
  },
  skeleton: {
    width: '100%',
    height: 160,
    borderRadius: Radius.card,
    backgroundColor: Brand.border,
  },
  error: {
    color: Brand.danger,
  },
});
