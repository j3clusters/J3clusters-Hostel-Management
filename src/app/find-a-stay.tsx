import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CityIllustration } from '@/components/illustrations/brand-illustrations';
import { PropertyCard } from '@/components/property-card';
import { SaveStayPrompt } from '@/components/save-stay-prompt';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { isPropertyCategory, propertyCategories, type PropertyCategory } from '@/constants/property';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { removeSavedStay, saveApprovedStay } from '@/lib/saved-stays';
import { loadReviewSummaries, reviewSummaryLabel } from '@/lib/stay-reviews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Listing = {
  id: string;
  name: string;
  category: PropertyCategory;
  city: string;
  locality: string;
  monthly_rent: number | string;
  cover_path: string | null;
};

type CategoryFilter = 'all' | PropertyCategory;

export default function FindAStayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [promptPropertyId, setPromptPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState(supabase ? '' : 'Supabase is not connected.');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [reviewLabels, setReviewLabels] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      if (!supabase) {
        return;
      }

      const attempt = reloadKey;
      let active = true;

      void Promise.all([
        supabase
          .from('properties')
          .select('id, name, category, city, locality, monthly_rent, cover_path')
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
        loadReviewSummaries(),
      ]).then(([listResult, summaryResult]) => {
          if (!active || attempt !== reloadKey) {
            return;
          }
          if (listResult.error || summaryResult.error) {
            setError(listResult.error?.message || summaryResult.error);
          } else {
            setError('');
            setListings((listResult.data ?? []).filter((item): item is Listing => isPropertyCategory(item.category)));
            setReviewLabels(
              Object.fromEntries(
                Object.values(summaryResult.summaries).map((summary) => [
                  summary.propertyId,
                  reviewSummaryLabel(summary.averageRating, summary.reviewCount),
                ]),
              ),
            );
          }
          setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [reloadKey]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void supabase
        .from('saved_properties')
        .select('property_id')
        .eq('user_id', user.id)
        .then(({ data, error: loadError }) => {
          if (!active) {
            return;
          }
          if (loadError) {
            setError(loadError.message);
            return;
          }
          setSavedIds((data ?? []).map((row) => row.property_id));
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  async function toggleSave(propertyId: string) {
    if (!user) {
      setPromptPropertyId(propertyId);
      return;
    }
    if (!supabase || savingId) {
      return;
    }

    const alreadySaved = savedIds.includes(propertyId);
    setSavingId(propertyId);
    setError('');
    const saveError = alreadySaved ? await removeSavedStay(user.id, propertyId) : await saveApprovedStay(user.id, propertyId);
    setSavingId(null);

    if (saveError) {
      setError(saveError);
      return;
    }

    setSavedIds((current) =>
      alreadySaved ? current.filter((id) => id !== propertyId) : [...current, propertyId],
    );
  }

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((listing) => {
      const place = `${listing.name} ${listing.locality} ${listing.city}`.toLowerCase();
      const matchesSearch = query.length === 0 || place.includes(query);
      const matchesCategory = category === 'all' || listing.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, listings, search]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <CityIllustration />
        <AppText variant="eyebrow">J3 Cluster</AppText>
        <AppText variant="title">Find your next stay</AppText>
        <AppText variant="body">Search approved PG, hostel, and hotel stays. No account is required.</AppText>
        <AppTextField label="City or locality" value={search} onChangeText={setSearch} autoCapitalize="words" />
        <View style={styles.filters}>
          <FilterChip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
          {propertyCategories.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              selected={category === item.value}
              onPress={() => setCategory(item.value)}
            />
          ))}
        </View>
        {visibleListings.length > 0 ? (
          <AppText variant="caption">{visibleListings.length === 1 ? '1 stay' : `${visibleListings.length} stays`}</AppText>
        ) : null}
        {loading ? (
          <>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
          </>
        ) : error ? (
          <>
            <AppText style={styles.error}>{error}</AppText>
            <AppButton
              label="Try again"
              onPress={() => {
                setLoading(true);
                setError('');
                setReloadKey((current) => current + 1);
              }}
            />
          </>
        ) : listings.length === 0 ? (
          <EmptyState
            illustration="property"
            title="No approved stays yet"
            message="Only properties an administrator has approved are shown here. Nothing on this screen is sample data."
          />
        ) : visibleListings.length === 0 ? (
          <EmptyState illustration="property" title="No matching stays" message="Try another city, locality, or property type." />
        ) : (
          visibleListings.map((listing) => (
            <PropertyCard
              key={listing.id}
              listing={listing}
              saved={Boolean(user) && savedIds.includes(listing.id)}
              saving={savingId === listing.id}
              reviewLabel={reviewLabels[listing.id]}
              onPress={() => router.push(`/property/${listing.id}` as Href)}
              onSavePress={() => void toggleSave(listing.id)}
            />
          ))
        )}
        <SaveStayPrompt
          visible={promptPropertyId !== null}
          onLater={() => setPromptPropertyId(null)}
          onContinueWithEmail={() => {
            const propertyId = promptPropertyId;
            setPromptPropertyId(null);
            if (propertyId) {
              router.push(`/sign-in?propertyId=${propertyId}&action=save` as Href);
            }
          }}
        />
      </View>
    </Screen>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <AppText variant="body" style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  filters: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.white,
  },
  chipSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  chipLabel: {
    color: Brand.text,
    fontWeight: '700',
  },
  chipLabelSelected: {
    color: Brand.white,
  },
  skeleton: {
    width: '100%',
    height: 220,
    borderRadius: Radius.card,
    backgroundColor: Brand.border,
  },
  error: {
    color: Brand.danger,
  },
});
