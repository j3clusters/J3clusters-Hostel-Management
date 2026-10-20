import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';

import { PropertyCover } from '@/components/property-cover';
import { SaveStayButton } from '@/components/save-stay-button';
import { SaveStayPrompt } from '@/components/save-stay-prompt';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { categoryLabel, formatMonthlyRent, isPropertyCategory } from '@/constants/property';
import { isSharingType, sharingLabel } from '@/constants/rooms';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  clearPendingMoveIn,
  isBookingStatus,
  peekPendingMoveIn,
  peekPendingMoveInPart,
  requestBooking,
  setPendingMoveIn,
  setPendingMoveInPart,
  bookingStatusLabel,
  type BookingStatus,
} from '@/lib/booking-requests';
import {
  clearPendingEnquiryMessage,
  peekPendingEnquiryMessage,
  sendEnquiry,
  setPendingEnquiryMessage,
} from '@/lib/enquiries';
import { isVisitStatus, clearPendingVisitOn, isVisitPart, peekPendingVisitOn, peekPendingVisitPart, requestVisit, setPendingVisitOn, setPendingVisitPart, visitParts, visitPartLabel, visitStatusLabel, type VisitPart, type VisitStatus } from '@/lib/property-visits';
import { kolkataToday, leaveDateChoices, leaveDateLabel } from '@/lib/leave-requests';
import { removeSavedStay, saveApprovedStay } from '@/lib/saved-stays';
import { type StayAction } from '@/lib/stay-action';
import { loadPropertyReviews, loadReviewSummaries, ratingLabel, reviewSummaryLabel, stayReviewDateLabel, type PublicStayReview } from '@/lib/stay-reviews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type PropertyDetails = {
  name: string;
  category: string;
  city: string;
  locality: string;
  address: string | null;
  description: string | null;
  house_rules: string | null;
  monthly_rent: number | string;
  cover_path: string | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; action?: string }>();
  const { user } = useAuth();
  const propertyId = firstParam(params.id);
  const action = firstParam(params.action);
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase && propertyId));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visitStatus, setVisitStatus] = useState<VisitStatus | null>(null);
  const [requestingVisit, setRequestingVisit] = useState(false);
  const [visitOn, setVisitOn] = useState(kolkataToday);
  const [visitPart, setVisitPart] = useState<VisitPart>('morning');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [bedSummary, setBedSummary] = useState<{ roomName: string; sharing: string; total: number; available: number }[]>([]);
  const [requestingBooking, setRequestingBooking] = useState(false);
  const [moveIn, setMoveIn] = useState(kolkataToday);
  const [moveInPart, setMoveInPart] = useState<VisitPart>('morning');
  const [reviews, setReviews] = useState<PublicStayReview[]>([]);
  const [reviewLabel, setReviewLabel] = useState('');
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [sendingEnquiry, setSendingEnquiry] = useState(false);
  const [promptAction, setPromptAction] = useState<StayAction | null>(null);
  const [error, setError] = useState(propertyId ? '' : 'This stay could not be opened.');
  const completedAction = useRef('');

  useEffect(() => {
    if (!supabase || !propertyId) {
      return;
    }

    let active = true;

    void supabase
      .from('properties')
      .select('name, category, city, locality, address, description, house_rules, monthly_rent, cover_path')
      .eq('id', propertyId)
      .eq('status', 'approved')
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) {
          return;
        }
        if (loadError) {
          setError(loadError.message);
        } else if (!data || !isPropertyCategory(data.category)) {
          setError('This stay is not available.');
        } else {
          setProperty({
            ...data,
            house_rules: typeof data.house_rules === 'string' ? data.house_rules : null,
          });
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) {
      return;
    }

    let active = true;
    void Promise.all([loadPropertyReviews(propertyId), loadReviewSummaries()]).then(([reviewResult, summaryResult]) => {
      if (!active) {
        return;
      }
      if (reviewResult.error) {
        setError(reviewResult.error);
        return;
      }
      setReviews(reviewResult.reviews);
      if (summaryResult.error) {
        setError(summaryResult.error);
        return;
      }
      const summary = summaryResult.summaries[propertyId];
      setReviewLabel(summary ? reviewSummaryLabel(summary.averageRating, summary.reviewCount) : '');
    });

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!supabase || !propertyId) {
      return;
    }

    let active = true;
    void supabase.rpc('property_bed_summary', { target_id: propertyId }).then(({ data, error: loadError }) => {
      if (!active || loadError || !data) {
        return;
      }
      setBedSummary(
        (data as { room_name: string; sharing_type: string; total_beds: number; available_beds: number }[]).flatMap((row) => {
          if (!isSharingType(row.sharing_type)) {
            return [];
          }
          return [
            {
              roomName: row.room_name,
              sharing: sharingLabel(row.sharing_type),
              total: row.total_beds,
              available: row.available_beds,
            },
          ];
        }),
      );
    });

    return () => {
      active = false;
    };
  }, [propertyId]);

  useEffect(() => {
    if (!supabase || !user || !propertyId) {
      return;
    }

    let active = true;
    void supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active || loadError) {
          return;
        }
        setSaved(Boolean(data));
      });

    return () => {
      active = false;
    };
  }, [propertyId, user]);

  useEffect(() => {
    if (!supabase || !user || !propertyId) {
      return;
    }

    let active = true;
    void supabase
      .from('property_visits')
      .select('status')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .in('status', ['requested', 'confirmed', 'rescheduled'])
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active || loadError || !data || !isVisitStatus(data.status)) {
          return;
        }
        setVisitStatus(data.status);
      });

    return () => {
      active = false;
    };
  }, [propertyId, user]);

  useEffect(() => {
    if (!supabase || !user || !propertyId) {
      return;
    }

    let active = true;
    void supabase
      .from('enquiries')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .eq('status', 'open')
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active || loadError) {
          return;
        }
        setEnquiryOpen(Boolean(data));
      });

    return () => {
      active = false;
    };
  }, [propertyId, user]);

  useEffect(() => {
    if (!supabase || !user || !propertyId) {
      return;
    }

    let active = true;
    void supabase
      .from('booking_requests')
      .select('status')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .in('status', ['requested', 'confirmed', 'checked_in'])
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active || loadError || !data || !isBookingStatus(data.status)) {
          return;
        }
        setBookingStatus(data.status);
      });

    return () => {
      active = false;
    };
  }, [propertyId, user]);

  useEffect(() => {
    if (!user || !propertyId || (action !== 'save' && action !== 'visit' && action !== 'enquiry' && action !== 'booking')) {
      return;
    }

    const key = `${action}:${user.id}:${propertyId}`;
    if (completedAction.current === key) {
      return;
    }
    completedAction.current = key;

    const enquiryMessageToSend = action === 'enquiry' ? peekPendingEnquiryMessage() : '';
    if (action === 'enquiry' && enquiryMessageToSend.length < 10) {
      completedAction.current = '';
      router.setParams({ action: '' });
      void Promise.resolve().then(() => {
        setError('Enter your enquiry again.');
      });
      return;
    }

    const moveInToSend = action === 'booking' ? peekPendingMoveIn() : '';
    const moveInPartToSend = action === 'booking' ? peekPendingMoveInPart() : '';
    if (action === 'booking' && (!moveInToSend || !isVisitPart(moveInPartToSend))) {
      completedAction.current = '';
      router.setParams({ action: '' });
      void Promise.resolve().then(() => {
        setError('Choose a move-in date again.');
      });
      return;
    }

    const visitOnToSend = action === 'visit' ? peekPendingVisitOn() : '';
    const visitPartToSend = action === 'visit' ? peekPendingVisitPart() : '';
    if (action === 'visit' && (!visitOnToSend || !isVisitPart(visitPartToSend))) {
      completedAction.current = '';
      router.setParams({ action: '' });
      void Promise.resolve().then(() => {
        setError('Choose a visit date again.');
      });
      return;
    }

    const pending =
      action === 'save'
        ? saveApprovedStay(user.id, propertyId)
        : action === 'visit'
          ? requestVisit(user.id, propertyId, visitOnToSend, visitPartToSend)
          : action === 'booking'
            ? requestBooking(user.id, propertyId, moveInToSend, moveInPartToSend)
            : sendEnquiry(user.id, propertyId, enquiryMessageToSend);
    void pending.then((actionError) => {
      const alreadySent =
        actionError === 'You already have an open enquiry for this stay.' ||
        actionError === 'You already have a booking request for this stay.';
      if (actionError && !alreadySent) {
        completedAction.current = '';
        setEnquiryMessage(enquiryMessageToSend);
        if (moveInToSend) {
          setMoveIn(moveInToSend);
        }
        if (isVisitPart(moveInPartToSend)) {
          setMoveInPart(moveInPartToSend);
        }
        if (visitOnToSend) {
          setVisitOn(visitOnToSend);
        }
        if (isVisitPart(visitPartToSend)) {
          setVisitPart(visitPartToSend);
        }
        setError(actionError);
        return;
      }
      if (action === 'save') {
        setSaved(true);
      } else if (action === 'visit') {
        clearPendingVisitOn();
        setVisitStatus('requested');
      } else if (action === 'booking') {
        clearPendingMoveIn();
        setBookingStatus('requested');
      } else {
        clearPendingEnquiryMessage();
        setEnquiryMessage('');
        setEnquiryOpen(true);
      }
      router.setParams({ action: '' });
    });
  }, [action, propertyId, router, user]);

  async function toggleSave() {
    if (!propertyId) {
      return;
    }
    if (!user) {
      setPromptAction('save');
      return;
    }

    setSaving(true);
    setError('');
    const saveError = saved ? await removeSavedStay(user.id, propertyId) : await saveApprovedStay(user.id, propertyId);
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setSaved((current) => !current);
  }

  async function askForVisit() {
    if (!propertyId) {
      return;
    }
    if (visitStatus) {
      return;
    }
    if (!leaveDateChoices(kolkataToday(), 14).some((item) => item.value === visitOn) || !isVisitPart(visitPart)) {
      setError('Choose a visit date.');
      return;
    }
    if (!user) {
      setPendingVisitOn(visitOn);
      setPendingVisitPart(visitPart);
      setPromptAction('visit');
      return;
    }

    setRequestingVisit(true);
    setError('');
    const visitError = await requestVisit(user.id, propertyId, visitOn, visitPart);
    setRequestingVisit(false);

    if (visitError) {
      setError(visitError);
      return;
    }

    setVisitStatus('requested');
  }

  async function askForBooking() {
    if (!propertyId || bookingStatus) {
      return;
    }
    if (!leaveDateChoices(kolkataToday(), 14).some((item) => item.value === moveIn) || !isVisitPart(moveInPart)) {
      setError('Choose a move-in date.');
      return;
    }
    if (!user) {
      setPendingMoveIn(moveIn);
      setPendingMoveInPart(moveInPart);
      setPromptAction('booking');
      return;
    }

    setRequestingBooking(true);
    setError('');
    const bookingError = await requestBooking(user.id, propertyId, moveIn, moveInPart);
    setRequestingBooking(false);

    if (bookingError && bookingError !== 'You already have a booking request for this stay.') {
      setError(bookingError);
      return;
    }

    setBookingStatus('requested');
  }

  async function submitEnquiry() {
    if (!propertyId || enquiryOpen) {
      return;
    }

    const message = enquiryMessage.trim();
    if (message.length < 10) {
      setError('Write an enquiry of at least 10 characters.');
      return;
    }
    if (!user) {
      setPendingEnquiryMessage(message);
      setPromptAction('enquiry');
      return;
    }

    setSendingEnquiry(true);
    setError('');
    const enquiryError = await sendEnquiry(user.id, propertyId, message);
    setSendingEnquiry(false);

    if (enquiryError && enquiryError !== 'You already have an open enquiry for this stay.') {
      setError(enquiryError);
      return;
    }

    setEnquiryMessage('');
    setEnquiryOpen(true);
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.skeleton} />
        ) : !property || !isPropertyCategory(property.category) ? (
          <AppText style={styles.error}>{error || 'This stay is not available.'}</AppText>
        ) : (
          <>
            <View style={styles.hero}>
              <PropertyCover label={property.name} coverPath={property.cover_path} />
              <View style={styles.save}>
                <SaveStayButton saved={Boolean(user) && saved} disabled={saving} onPress={() => void toggleSave()} />
              </View>
            </View>
            <View style={styles.summary}>
              <StatusBadge label={categoryLabel[property.category]} />
              <AppText variant="title">{property.name}</AppText>
              <AppText variant="body">
                {property.locality}, {property.city}
              </AppText>
              {property.address ? <AppText variant="body">{property.address}</AppText> : null}
              <AppText variant="section" style={styles.price}>
                {formatMonthlyRent(property.monthly_rent)}
              </AppText>
              {reviewLabel ? <AppText variant="body">{reviewLabel}</AppText> : null}
            </View>
            <View style={styles.section}>
              <AppText variant="section">Beds</AppText>
              {bedSummary.length === 0 ? (
                <AppText variant="body">Rooms have not been added yet.</AppText>
              ) : (
                bedSummary.map((room, index) => (
                  <AppText key={`${room.roomName}-${index}`} variant="body">
                    {room.roomName} · {room.sharing} · {room.available} of {room.total} beds available
                  </AppText>
                ))
              )}
            </View>
            {property.description ? (
              <View style={styles.section}>
                <AppText variant="section">About this stay</AppText>
                <AppText variant="body">{property.description}</AppText>
              </View>
            ) : null}
            {property.house_rules ? (
              <View style={styles.section}>
                <AppText variant="section">House rules</AppText>
                <AppText variant="body">{property.house_rules}</AppText>
              </View>
            ) : null}
            <View style={styles.section}>
              <AppText variant="section">Stay reviews</AppText>
              {reviews.length === 0 ? (
                <AppText variant="body">No stay reviews yet.</AppText>
              ) : (
                reviews.map((review) => (
                  <View key={`${review.createdAt}-${review.note}`} style={styles.review}>
                    <AppText variant="body" style={styles.emphasis}>
                      {ratingLabel(review.rating)}
                    </AppText>
                    <AppText variant="body">{review.note}</AppText>
                    <AppText variant="caption">{stayReviewDateLabel(review.createdAt)}</AppText>
                    {review.ownerReply ? (
                      <View style={styles.reply}>
                        <AppText variant="body" style={styles.emphasis}>
                          Owner reply
                        </AppText>
                        <AppText variant="body">{review.ownerReply}</AppText>
                        {review.repliedAt ? <AppText variant="caption">{stayReviewDateLabel(review.repliedAt)}</AppText> : null}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
            {visitStatus ? (
              <StatusBadge label={`Visit ${visitStatusLabel[visitStatus]}`} />
            ) : (
              <View style={styles.section}>
                <AppText variant="section">Visit date</AppText>
                <View style={styles.choices}>
                  {leaveDateChoices(kolkataToday(), 14).map((item) => (
                    <Pressable
                      key={`visit-${item.value}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: visitOn === item.value }}
                      onPress={() => setVisitOn(item.value)}
                      style={[styles.choice, visitOn === item.value && styles.choiceSelected]}>
                      <AppText variant="body" style={visitOn === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {leaveDateLabel(item.value)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.choices}>
                  {visitParts.map((part) => (
                    <Pressable
                      key={part}
                      accessibilityRole="button"
                      accessibilityState={{ selected: visitPart === part }}
                      onPress={() => setVisitPart(part)}
                      style={[styles.choice, visitPart === part && styles.choiceSelected]}>
                      <AppText variant="body" style={visitPart === part ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {visitPartLabel(part)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <AppButton
                  label={requestingVisit ? 'Requesting...' : 'Request a visit'}
                  disabled={requestingVisit}
                  onPress={() => void askForVisit()}
                />
              </View>
            )}
            {enquiryOpen ? (
              <StatusBadge label="Enquiry sent" />
            ) : (
              <View style={styles.section}>
                <AppText variant="section">Enquiry</AppText>
                <AppTextField
                  label="Enquiry"
                  value={enquiryMessage}
                  onChangeText={setEnquiryMessage}
                  autoCapitalize="sentences"
                  multiline
                />
                <AppButton
                  label={sendingEnquiry ? 'Sending...' : 'Send enquiry'}
                  disabled={sendingEnquiry}
                  onPress={() => void submitEnquiry()}
                />
              </View>
            )}
            {bookingStatus ? (
              <StatusBadge label={`Booking ${bookingStatusLabel[bookingStatus]}`} />
            ) : (
              <View style={styles.section}>
                <AppText variant="section">Move-in date</AppText>
                <View style={styles.choices}>
                  {leaveDateChoices(kolkataToday(), 14).map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: moveIn === item.value }}
                      onPress={() => setMoveIn(item.value)}
                      style={[styles.choice, moveIn === item.value && styles.choiceSelected]}>
                      <AppText variant="body" style={moveIn === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {leaveDateLabel(item.value)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.choices}>
                  {visitParts.map((part) => (
                    <Pressable
                      key={`move-${part}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: moveInPart === part }}
                      onPress={() => setMoveInPart(part)}
                      style={[styles.choice, moveInPart === part && styles.choiceSelected]}>
                      <AppText variant="body" style={moveInPart === part ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {visitPartLabel(part)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <AppButton
                  label={requestingBooking ? 'Requesting...' : 'Request a booking'}
                  disabled={requestingBooking}
                  onPress={() => void askForBooking()}
                />
              </View>
            )}
            <AppText variant="body">
              Choose a move-in date and time of day. A booking request does not take payment. Check-in keeps the confirmed bed until check-out.
            </AppText>
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
          </>
        )}
        <SaveStayPrompt
          visible={promptAction !== null}
          onLater={() => {
            if (promptAction === 'enquiry') {
              clearPendingEnquiryMessage();
            }
            if (promptAction === 'booking') {
              clearPendingMoveIn();
            }
            if (promptAction === 'visit') {
              clearPendingVisitOn();
            }
            setPromptAction(null);
          }}
          onContinueWithEmail={() => {
            const nextAction = promptAction;
            setPromptAction(null);
            if (propertyId && nextAction) {
              router.push(`/sign-in?propertyId=${propertyId}&action=${nextAction}` as Href);
            }
          }}
        />
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
  hero: {
    width: '100%',
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Brand.white,
    ...Shadow.card,
  },
  save: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  summary: {
    width: '100%',
    gap: Spacing.two,
  },
  section: {
    width: '100%',
    gap: Spacing.two,
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  price: {
    color: Brand.text,
    fontSize: 26,
    lineHeight: 32,
  },
  emphasis: {
    color: Brand.text,
    fontWeight: '700',
  },
  review: {
    width: '100%',
    gap: Spacing.two,
  },
  reply: {
    width: '100%',
    gap: Spacing.one,
    backgroundColor: Brand.primarySoft,
    borderRadius: Radius.input,
    padding: Spacing.three,
  },
  skeleton: {
    width: '100%',
    height: 280,
    borderRadius: Radius.card,
    backgroundColor: Brand.border,
  },
  error: {
    color: Brand.danger,
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
});
