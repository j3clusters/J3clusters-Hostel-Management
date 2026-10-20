import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PropertyCover } from '@/components/property-cover';
import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { categoryLabel, formatMonthlyRent, isPropertyCategory, propertyCategories, type PropertyCategory } from '@/constants/property';
import { isSharingType, sharingLabel, sharingTypes, type SharingType } from '@/constants/rooms';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { uploadPropertyCover } from '@/lib/property-photos';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type OwnedProperty = {
  id: string;
  name: string;
  category: PropertyCategory;
  city: string;
  locality: string;
  address: string;
  description: string;
  monthly_rent: number | string;
  houseRules: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  cover_path: string | null;
};

const statusLabel = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
} as const;

export default function MyPropertiesScreen() {
  const { user, role } = useAuth();
  const [properties, setProperties] = useState<OwnedProperty[]>([]);
  const [loading, setLoading] = useState(role === 'owner');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState<Record<string, number>>({});
  const [error, setError] = useState(role === 'owner' ? '' : 'Only an owner can manage property photos.');
  const [rooms, setRooms] = useState<{ id: string; propertyId: string; name: string; sharing: SharingType; bedCount: number }[]>([]);
  const [roomPropertyId, setRoomPropertyId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [sharing, setSharing] = useState<SharingType>('double');
  const [bedCount, setBedCount] = useState('2');
  const [addingRoom, setAddingRoom] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<PropertyCategory>('pg');
  const [editCity, setEditCity] = useState('');
  const [editLocality, setEditLocality] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRent, setEditRent] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [rulesId, setRulesId] = useState<string | null>(null);
  const [rulesText, setRulesText] = useState('');
  const [savingRules, setSavingRules] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || role !== 'owner') {
        return;
      }

      let active = true;
      void supabase
        .from('properties')
        .select('id, name, category, city, locality, address, description, monthly_rent, house_rules, status, cover_path')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error: loadError }) => {
          if (!active) {
            return;
          }
          if (loadError) {
            setError(loadError.message);
          } else {
            setError('');
            setProperties(
              (data ?? []).flatMap((item) => {
                if (!isPropertyCategory(item.category) || !isStatus(item.status)) {
                  return [];
                }
                return [{
                  ...item,
                  category: item.category,
                  status: item.status,
                  address: typeof item.address === 'string' ? item.address : '',
                  description: typeof item.description === 'string' ? item.description : '',
                  houseRules: typeof item.house_rules === 'string' ? item.house_rules : '',
                }];
              }),
            );
          }
          setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || role !== 'owner') {
        return;
      }

      let active = true;
      void supabase
        .from('rooms')
        .select('id, property_id, name, sharing_type, beds(id)')
        .order('name', { ascending: true })
        .then(({ data, error: loadError }) => {
          if (!active || loadError) {
            return;
          }
          setRooms(
            (data ?? []).flatMap((room) => {
              if (!isSharingType(room.sharing_type)) {
                return [];
              }
              const roomBeds = Array.isArray(room.beds) ? room.beds : [];
              return [
                {
                  id: room.id,
                  propertyId: room.property_id,
                  name: room.name,
                  sharing: room.sharing_type,
                  bedCount: roomBeds.length,
                },
              ];
            }),
          );
        });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  async function addRoom(propertyId: string) {
    if (!supabase || addingRoom) {
      return;
    }

    const count = Number(bedCount);
    if (roomName.trim().length < 2 || !Number.isInteger(count) || count < 1 || count > 12) {
      setError('Enter a room name and a bed count from 1 to 12.');
      return;
    }

    setAddingRoom(true);
    setEditingId(null);
    setError('');
    const { data, error: addError } = await supabase.rpc('add_room', {
      target_property: propertyId,
      room_name: roomName.trim(),
      sharing,
      bed_count: count,
    });
    setAddingRoom(false);

    if (addError || !data) {
      setError(addError?.message || 'The room could not be added.');
      return;
    }

    setRooms((current) => [
      ...current,
      { id: data, propertyId, name: roomName.trim(), sharing, bedCount: count },
    ]);
    setRoomName('');
    setRoomPropertyId(null);
  }

  function beginCorrect(property: OwnedProperty) {
    const amount = Number(property.monthly_rent);
    setRoomPropertyId(null);
    setRulesId(null);
    setEditingId(property.id);
    setEditName(property.name);
    setEditCategory(property.category);
    setEditCity(property.city);
    setEditLocality(property.locality);
    setEditAddress(property.address);
    setEditDescription(property.description);
    setEditRent(Number.isFinite(amount) ? String(amount) : '');
    setError('');
  }

  async function saveCorrection(propertyId: string) {
    if (!supabase || savingCorrection) {
      return;
    }

    const monthlyRent = Number(editRent);
    if (
      editName.trim().length < 2 ||
      editName.trim().length > 80 ||
      editCity.trim().length < 2 ||
      editCity.trim().length > 60 ||
      editLocality.trim().length < 2 ||
      editLocality.trim().length > 60 ||
      editAddress.trim().length < 5 ||
      editAddress.trim().length > 200 ||
      editDescription.trim().length < 10 ||
      editDescription.trim().length > 500
    ) {
      setError('Enter the name, city, locality, address, and a short description.');
      return;
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0 || monthlyRent > 1000000) {
      setError('Enter a monthly rent greater than 0 and up to 1000000.');
      return;
    }

    setSavingCorrection(true);
    setError('');
    const { error: saveError } = await supabase.rpc('correct_pending_property', {
      target_property: propertyId,
      property_name: editName.trim(),
      property_category: editCategory,
      property_city: editCity.trim(),
      property_locality: editLocality.trim(),
      property_address: editAddress.trim(),
      property_description: editDescription.trim(),
      property_rent: monthlyRent,
    });
    setSavingCorrection(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setProperties((current) =>
      current.map((item) =>
        item.id === propertyId
          ? {
              ...item,
              name: editName.trim(),
              category: editCategory,
              city: editCity.trim(),
              locality: editLocality.trim(),
              address: editAddress.trim(),
              description: editDescription.trim(),
              monthly_rent: monthlyRent,
            }
          : item,
      ),
    );
    setEditingId(null);
  }

  async function withdrawProperty(propertyId: string) {
    if (!supabase || withdrawingId) {
      return;
    }

    setWithdrawingId(propertyId);
    setError('');
    const { error: withdrawError } = await supabase.rpc('withdraw_pending_property', {
      target_property: propertyId,
    });
    setWithdrawingId(null);

    if (withdrawError) {
      setError(withdrawError.message);
      return;
    }

    setProperties((current) =>
      current.map((item) => (item.id === propertyId ? { ...item, status: 'withdrawn' } : item)),
    );
    setConfirmingId(null);
    setEditingId(null);
  }

  function beginRules(property: OwnedProperty) {
    setEditingId(null);
    setConfirmingId(null);
    setRoomPropertyId(null);
    setRulesId(property.id);
    setRulesText(property.houseRules);
    setError('');
  }

  async function saveRules(propertyId: string) {
    if (!supabase || savingRules) {
      return;
    }

    const cleaned = rulesText.trim();
    if (cleaned.length > 0 && (cleaned.length < 10 || cleaned.length > 500)) {
      setError('Write house rules of 10 to 500 characters, or leave them blank.');
      return;
    }

    setSavingRules(true);
    setError('');
    const { error: saveError } = await supabase.rpc('set_house_rules', {
      target_property: propertyId,
      rules_text: cleaned,
    });
    setSavingRules(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setProperties((current) => current.map((item) => (item.id === propertyId ? { ...item, houseRules: cleaned } : item)));
    setRulesId(null);
  }

  async function changeCover(propertyId: string) {
    if (uploadingId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    setUploadingId(propertyId);
    setError('');
    const uploadError = await uploadPropertyCover(
      propertyId,
      result.assets[0].uri,
      result.assets[0].mimeType ?? 'image/jpeg',
    );
    setUploadingId(null);

    if (uploadError) {
      setError(uploadError);
      return;
    }

    setProperties((current) =>
      current.map((item) => (item.id === propertyId ? { ...item, cover_path: `${propertyId}/cover` } : item)),
    );
    setPhotoVersion((current) => ({ ...current, [propertyId]: (current[propertyId] ?? 0) + 1 }));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">My properties</AppText>
        <AppText variant="body">
          Add rooms and a cover photo. House rules show on an approved stay. You can correct or withdraw a property while it is waiting for approval.
        </AppText>
        {role !== 'owner' ? (
          <AppText variant="body">Only an owner can manage property photos.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && properties.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : properties.length === 0 ? (
          <EmptyState title="No properties yet" message="Add a property first, then come back to add its photo." />
        ) : (
          properties.map((property) => (
            <View key={property.id} style={styles.card}>
              <PropertyCover
                key={`${property.cover_path ?? 'none'}-${photoVersion[property.id] ?? 0}`}
                label={property.name}
                coverPath={property.cover_path}
              />
              <View style={styles.body}>
                <StatusBadge label={statusLabel[property.status]} />
                <AppText variant="body" style={styles.name}>
                  {property.name}
                </AppText>
                <AppText variant="body">
                  {categoryLabel[property.category]} · {property.locality}, {property.city}
                </AppText>
                <AppText variant="body">{formatMonthlyRent(property.monthly_rent)}</AppText>
                {rooms
                  .filter((room) => room.propertyId === property.id)
                  .map((room) => (
                    <AppText key={room.id} variant="body">
                      {room.name} · {sharingLabel(room.sharing)} · {room.bedCount} beds
                    </AppText>
                  ))}
                {roomPropertyId === property.id ? (
                  <>
                    <AppTextField label="Room name" value={roomName} onChangeText={setRoomName} autoCapitalize="words" />
                    <View style={styles.choices}>
                      {sharingTypes.map((item) => (
                        <Pressable
                          key={item.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected: sharing === item.value }}
                          onPress={() => setSharing(item.value)}
                          style={[styles.choice, sharing === item.value && styles.choiceSelected]}>
                          <AppText variant="body" style={sharing === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                            {item.label}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                    <AppTextField label="Number of beds" value={bedCount} onChangeText={setBedCount} keyboardType="number-pad" />
                    <AppButton
                      label={addingRoom ? 'Adding...' : 'Save room'}
                      disabled={addingRoom}
                      onPress={() => void addRoom(property.id)}
                    />
                  </>
                ) : (
                  <AppButton
                    label="Add a room"
                    variant="secondary"
                    onPress={() => {
                      setEditingId(null);
                      setRulesId(null);
                      setRoomPropertyId(property.id);
                    }}
                  />
                )}
                <AppButton
                  label={uploadingId === property.id ? 'Uploading...' : property.cover_path ? 'Change photo' : 'Add photo'}
                  disabled={uploadingId !== null}
                  onPress={() => void changeCover(property.id)}
                />
                {property.houseRules ? <AppText variant="body">{property.houseRules}</AppText> : null}
                {(property.status === 'pending' || property.status === 'approved') && rulesId === property.id ? (
                  <>
                    <AppTextField
                      label="House rules"
                      value={rulesText}
                      onChangeText={setRulesText}
                      autoCapitalize="sentences"
                      multiline
                    />
                    <AppButton
                      label={savingRules ? 'Saving...' : 'Save house rules'}
                      disabled={savingRules}
                      onPress={() => void saveRules(property.id)}
                    />
                    <AppButton label="Cancel" variant="secondary" onPress={() => setRulesId(null)} />
                  </>
                ) : property.status === 'pending' || property.status === 'approved' ? (
                  <AppButton
                    label={property.houseRules ? 'Edit house rules' : 'Add house rules'}
                    variant="secondary"
                    onPress={() => beginRules(property)}
                  />
                ) : null}
                {property.status === 'pending' && editingId === property.id ? (
                  <>
                    <AppTextField label="Property name" value={editName} onChangeText={setEditName} autoCapitalize="words" />
                    <View style={styles.choices}>
                      {propertyCategories.map((item) => (
                        <Pressable
                          key={item.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected: editCategory === item.value }}
                          onPress={() => setEditCategory(item.value)}
                          style={[styles.choice, editCategory === item.value && styles.choiceSelected]}>
                          <AppText variant="body" style={editCategory === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                            {item.label}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                    <AppTextField label="City" value={editCity} onChangeText={setEditCity} autoCapitalize="words" />
                    <AppTextField label="Locality" value={editLocality} onChangeText={setEditLocality} autoCapitalize="words" />
                    <AppTextField label="Address" value={editAddress} onChangeText={setEditAddress} autoCapitalize="sentences" />
                    <AppTextField
                      label="Description"
                      value={editDescription}
                      onChangeText={setEditDescription}
                      autoCapitalize="sentences"
                      multiline
                    />
                    <AppTextField label="Monthly rent in INR" value={editRent} onChangeText={setEditRent} keyboardType="decimal-pad" />
                    <AppButton
                      label={savingCorrection ? 'Saving...' : 'Save correction'}
                      disabled={savingCorrection}
                      onPress={() => void saveCorrection(property.id)}
                    />
                    <AppButton label="Cancel" variant="secondary" onPress={() => setEditingId(null)} />
                  </>
                ) : property.status === 'pending' ? (
                  <>
                    <AppButton
                      label="Correct details"
                      variant="secondary"
                      onPress={() => {
                        setConfirmingId(null);
                        beginCorrect(property);
                      }}
                    />
                    {confirmingId === property.id ? (
                      <>
                        <AppText variant="body">This removes it from review.</AppText>
                        <AppButton
                          label={withdrawingId === property.id ? 'Withdrawing...' : 'Confirm withdraw'}
                          disabled={withdrawingId !== null}
                          onPress={() => void withdrawProperty(property.id)}
                        />
                        <AppButton label="Cancel" variant="secondary" onPress={() => setConfirmingId(null)} />
                      </>
                    ) : (
                      <AppButton
                        label="Withdraw"
                        variant="secondary"
                        onPress={() => {
                          setEditingId(null);
                          setConfirmingId(property.id);
                        }}
                      />
                    )}
                  </>
                ) : null}
              </View>
            </View>
          ))
        )}
        {error && properties.length > 0 ? <AppText style={styles.error}>{error}</AppText> : null}
      </View>
    </Screen>
  );
}

function isStatus(value: string): value is OwnedProperty['status'] {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'withdrawn';
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  card: {
    width: '100%',
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  body: {
    width: '100%',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  name: {
    color: Brand.text,
    fontWeight: '800',
  },
  choices: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    minHeight: 40,
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
