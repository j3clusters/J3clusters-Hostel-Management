import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PropertyPhotoPlaceholder } from '@/components/property-photo-placeholder';
import { SaveStayButton } from '@/components/save-stay-button';
import { SaveStayPrompt } from '@/components/save-stay-prompt';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { categoryLabel, formatMonthlyRent, isPropertyCategory } from '@/constants/property';
import { Brand, Radius, Spacing } from '@/constants/theme';
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
      .select('name, category, city, locality, address, description, monthly_rent')
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
    if (!user || !propertyId || (action !== 'save' && action !== 'visit')) {
      return;
    }

    const key = `${action}:${user.id}:${propertyId}`;
    if (completedAction.current === key) {
      return;
    }
    completedAction.current = key;

    const pending = action === 'save' ? saveApprovedStay(user.id, propertyId) : requestVisit(user.id, propertyId);
    void pending.then((actionError) => {
      if (actionError) {
        completedAction.current = '';
        setError(actionError);
        return;
      }
      if (action === 'save') {
        setSaved(true);
      } else {
        setVisitStatus('requested');
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
              <PropertyPhotoPlaceholder label={property.name} />
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
            <AppText variant="body">A visit request is not a booking. Enquiries are not available yet.</AppText>
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
          </>
        )}
        <SaveStayPrompt
          visible={promptAction !== null}
          onLater={() => setPromptAction(null)}
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
