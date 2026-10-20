import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { Brand, Radius, Spacing } from '@/constants/theme';
import { isBookingStatus, requestBooking, bookingStatusLabel, type BookingStatus } from '@/lib/booking-requests';
import {
  clearPendingEnquiryMessage,
  peekPendingEnquiryMessage,
  sendEnquiry,
  setPendingEnquiryMessage,
} from '@/lib/enquiries';
import { isVisitStatus, requestVisit, visitStatusLabel, type VisitStatus } from '@/lib/property-visits';
import { removeSavedStay, saveApprovedStay } from '@/lib/saved-stays';
import { type StayAction } from '@/lib/stay-action';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type PropertyDetails = {
  name: string;
  category: string;
  city: string;
  locality: string;
  address: string | null;
  description: string | null;
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
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [bedSummary, setBedSummary] = useState<{ roomName: string; sharing: string; total: number; available: number }[]>([]);
  const [requestingBooking, setRequestingBooking] = useState(false);
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
      .select('name, category, city, locality, address, description, monthly_rent, cover_path')
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
          setProperty(data);
        }
        setLoading(false);
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
      .in('status', ['requested', 'confirmed'])
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

    const pending =
      action === 'save'
        ? saveApprovedStay(user.id, propertyId)
        : action === 'visit'
          ? requestVisit(user.id, propertyId)
          : action === 'booking'
            ? requestBooking(user.id, propertyId)
            : sendEnquiry(user.id, propertyId, enquiryMessageToSend);
    void pending.then((actionError) => {
      const alreadySent =
        actionError === 'You already have an open enquiry for this stay.' ||
        actionError === 'You already have a booking request for this stay.';
      if (actionError && !alreadySent) {
        completedAction.current = '';
        setEnquiryMessage(enquiryMessageToSend);
        setError(actionError);
        return;
      }
      if (action === 'save') {
        setSaved(true);
      } else if (action === 'visit') {
        setVisitStatus('requested');
      } else if (action === 'booking') {
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
    if (!user) {
      setPromptAction('visit');
      return;
    }
    if (visitStatus) {
      return;
    }

    setRequestingVisit(true);
    setError('');
    const visitError = await requestVisit(user.id, propertyId);
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
    if (!user) {
      setPromptAction('booking');
      return;
    }

    setRequestingBooking(true);
    setError('');
    const bookingError = await requestBooking(user.id, propertyId);
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
          <AppText variant="body">Loading stay...</AppText>
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
            <StatusBadge label={categoryLabel[property.category]} />
            <AppText variant="title">{property.name}</AppText>
            <AppText variant="body">
              {property.locality}, {property.city}
            </AppText>
            <AppText variant="body" style={styles.price}>
              {formatMonthlyRent(property.monthly_rent)}
            </AppText>
            {bedSummary.length === 0 ? (
              <AppText variant="body">Rooms have not been added yet.</AppText>
            ) : (
              bedSummary.map((room, index) => (
                <AppText key={`${room.roomName}-${index}`} variant="body">
                  {room.roomName} · {room.sharing} · {room.available} of {room.total} beds available
                </AppText>
              ))
            )}
            {property.address ? <AppText variant="body">{property.address}</AppText> : null}
            {property.description ? <AppText variant="body">{property.description}</AppText> : null}
            {visitStatus ? (
              <StatusBadge label={`Visit ${visitStatusLabel[visitStatus]}`} />
            ) : (
              <AppButton
                label={requestingVisit ? 'Requesting...' : 'Request a visit'}
                disabled={requestingVisit}
                onPress={() => void askForVisit()}
              />
            )}
            {enquiryOpen ? (
              <StatusBadge label="Enquiry sent" />
            ) : (
              <>
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
              </>
            )}
            {bookingStatus ? (
              <StatusBadge label={`Booking ${bookingStatusLabel[bookingStatus]}`} />
            ) : (
              <AppButton
                label={requestingBooking ? 'Requesting...' : 'Request a booking'}
                disabled={requestingBooking}
                onPress={() => void askForBooking()}
              />
            )}
            <AppText variant="body">
              A booking request does not take payment. Confirmation holds one bed and does not reserve a second bed for someone else.
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
  },
  save: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  price: {
    color: Brand.text,
    fontWeight: '700',
  },
  error: {
    color: Brand.danger,
  },
});
