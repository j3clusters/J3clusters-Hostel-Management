import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { Brand, Radius, Spacing } from '@/constants/theme';
import {
  bookingStatusLabel,
  checkInBooking,
  checkOutBooking,
  confirmBookingRequest,
  isBookingStatus,
  updateBookingRequest,
  type BookingStatus,
} from '@/lib/booking-requests';
import { depositLabel, isDepositStatus, markDepositReceived, recordDeposit, type Deposit } from '@/lib/deposits';
import {
  currentRentMonth,
  isRentChargeStatus,
  markRentReceived,
  recordRentCharge,
  rentChargeLabel,
  type RentCharge,
} from '@/lib/rent-charges';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type BookingItem = {
  id: string;
  status: BookingStatus;
  propertyId: string;
  bedId: string | null;
  bedLabel: string | null;
  name: string;
  locality: string;
  city: string;
};

type PropertyEmbed = {
  id: string;
  name: string;
  locality: string;
  city: string;
};

export default function BookingRequestsScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [mine, setMine] = useState<BookingItem[]>([]);
  const [incoming, setIncoming] = useState<BookingItem[]>([]);
  const [beds, setBeds] = useState<{ id: string; propertyId: string; roomName: string; label: string }[]>([]);
  const [takenBedIds, setTakenBedIds] = useState<string[]>([]);
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositRequestId, setDepositRequestId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(Boolean(user));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(user ? '' : 'Sign in to see booking requests.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void Promise.all([
        supabase
          .from('booking_requests')
          .select('id, status, property_id, bed_id, beds(label, rooms(name)), properties(id, name, locality, city)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        role === 'owner'
          ? supabase
              .from('booking_requests')
              .select('id, status, user_id, property_id, bed_id, beds(label, rooms(name)), properties!inner(id, name, locality, city, owner_id)')
              .eq('properties.owner_id', user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]).then(([ownResult, incomingResult]) => {
        if (!active) {
          return;
        }
        if (ownResult.error || incomingResult.error) {
          setError(ownResult.error?.message || incomingResult.error?.message || 'Booking requests could not be loaded.');
          setLoading(false);
          return;
        }

        setMine(toBookingItems(ownResult.data ?? []));
        setIncoming(toBookingItems((incomingResult.data ?? []).filter((row) => row.user_id !== user.id)));
        setError('');
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
      void Promise.all([
        supabase.from('rooms').select('property_id, name, beds(id, label)'),
        supabase.from('booking_requests').select('bed_id').in('status', ['confirmed', 'checked_in']),
      ]).then(([roomResult, takenResult]) => {
        if (!active) {
          return;
        }
        if (roomResult.error || takenResult.error) {
          setError(roomResult.error?.message || takenResult.error?.message || 'Rooms could not be loaded.');
          return;
        }

        setBeds(
          (roomResult.data ?? []).flatMap((room) => {
            const roomBeds = Array.isArray(room.beds) ? room.beds : [];
            return roomBeds.map((bed) => ({
              id: bed.id,
              propertyId: room.property_id,
              roomName: room.name,
              label: bed.label,
            }));
          }),
        );
        setTakenBedIds((takenResult.data ?? []).flatMap((row) => (row.bed_id ? [row.bed_id] : [])));
      });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void supabase
        .from('rent_charges')
        .select('id, booking_request_id, amount, period_month, status')
        .order('period_month', { ascending: false })
        .then(({ data, error: loadError }) => {
          if (!active) {
            return;
          }
          if (loadError) {
            setError(loadError.message);
            return;
          }
          setCharges(
            (data ?? []).flatMap((row) => {
              if (
                typeof row.id !== 'string' ||
                typeof row.booking_request_id !== 'string' ||
                typeof row.period_month !== 'string' ||
                !isRentChargeStatus(row.status)
              ) {
                return [];
              }
              return [
                {
                  id: row.id,
                  bookingRequestId: row.booking_request_id,
                  amount: row.amount,
                  periodMonth: row.period_month,
                  status: row.status,
                },
              ];
            }),
          );
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user) {
        return;
      }

      let active = true;
      void supabase
        .from('deposits')
        .select('id, booking_request_id, amount, status')
        .order('created_at', { ascending: false })
        .then(({ data, error: loadError }) => {
          if (!active) {
            return;
          }
          if (loadError) {
            setError(loadError.message);
            return;
          }
          setDeposits(
            (data ?? []).flatMap((row) => {
              if (typeof row.id !== 'string' || typeof row.booking_request_id !== 'string' || !isDepositStatus(row.status)) {
                return [];
              }
              return [
                {
                  id: row.id,
                  bookingRequestId: row.booking_request_id,
                  amount: row.amount,
                  status: row.status,
                },
              ];
            }),
          );
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  function stayIsBusy(requestId: string) {
    return (
      busyId === requestId ||
      charges.some((charge) => charge.id === busyId && charge.bookingRequestId === requestId) ||
      deposits.some((deposit) => deposit.id === busyId && deposit.bookingRequestId === requestId)
    );
  }

  async function confirmRequest(requestId: string, bedId: string) {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const confirmError = await confirmBookingRequest(requestId, bedId);
    setBusyId(null);

    if (confirmError) {
      setError(confirmError);
      return;
    }

    const bed = beds.find((item) => item.id === bedId);
    setIncoming((current) =>
      current.map((item) =>
        item.id === requestId
          ? { ...item, status: 'confirmed', bedId, bedLabel: bed ? `${bed.roomName}, ${bed.label}` : item.bedLabel }
          : item,
      ),
    );
    setTakenBedIds((current) => [...current, bedId]);
  }

  async function checkIn(requestId: string) {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const checkInError = await checkInBooking(requestId);
    setBusyId(null);

    if (checkInError) {
      setError(checkInError);
      return;
    }

    setIncoming((current) => current.map((item) => (item.id === requestId ? { ...item, status: 'checked_in' } : item)));
  }

  async function checkOut(requestId: string, list: 'mine' | 'incoming') {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const checkOutError = await checkOutBooking(requestId);
    setBusyId(null);

    if (checkOutError) {
      setError(checkOutError);
      return;
    }

    const source = list === 'mine' ? mine : incoming;
    const bedId = source.find((item) => item.id === requestId)?.bedId;
    const apply = (current: BookingItem[]): BookingItem[] =>
      current.map((item) => {
        if (item.id !== requestId) {
          return item;
        }
        const next: BookingItem = { ...item, status: 'checked_out', bedId: null };
        return next;
      });
    if (list === 'mine') {
      setMine(apply);
    } else {
      setIncoming(apply);
    }
    if (bedId) {
      setTakenBedIds((current) => current.filter((id) => id !== bedId));
    }
  }

  async function recordRent(requestId: string) {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const result = await recordRentCharge(requestId);
    setBusyId(null);

    if (result.error || !result.charge) {
      setError(result.error || 'Rent could not be recorded.');
      return;
    }

    setCharges((current) => [result.charge as RentCharge, ...current]);
  }

  async function markReceived(chargeId: string) {
    if (busyId) {
      return;
    }

    setBusyId(chargeId);
    setError('');
    const markError = await markRentReceived(chargeId);
    setBusyId(null);

    if (markError) {
      setError(markError);
      return;
    }

    setCharges((current) => current.map((charge) => (charge.id === chargeId ? { ...charge, status: 'received' } : charge)));
  }

  async function saveDeposit(requestId: string) {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const result = await recordDeposit(requestId, depositAmount);
    setBusyId(null);

    if (result.error || !result.deposit) {
      setError(result.error || 'The deposit could not be recorded.');
      return;
    }

    setDeposits((current) => [result.deposit as Deposit, ...current]);
    setDepositAmount('');
    setDepositRequestId(null);
  }

  async function markDeposit(depositId: string) {
    if (busyId) {
      return;
    }

    setBusyId(depositId);
    setError('');
    const markError = await markDepositReceived(depositId);
    setBusyId(null);

    if (markError) {
      setError(markError);
      return;
    }

    setDeposits((current) => current.map((deposit) => (deposit.id === depositId ? { ...deposit, status: 'received' } : deposit)));
  }

  async function changeStatus(requestId: string, status: 'rejected' | 'cancelled', list: 'mine' | 'incoming') {
    if (busyId) {
      return;
    }

    setBusyId(requestId);
    setError('');
    const updateError = await updateBookingRequest(requestId, status);
    setBusyId(null);

    if (updateError) {
      setError(updateError);
      return;
    }

    const source = list === 'mine' ? mine : incoming;
    const bedId = status === 'cancelled' ? source.find((item) => item.id === requestId)?.bedId : null;
    const apply = (current: BookingItem[]) =>
      current.map((item) => (item.id === requestId ? { ...item, status, bedId: status === 'cancelled' ? null : item.bedId } : item));
    if (list === 'mine') {
      setMine(apply);
    } else {
      setIncoming(apply);
    }
    if (bedId) {
      setTakenBedIds((current) => current.filter((id) => id !== bedId));
    }
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Booking requests</AppText>
        <AppText variant="body">
          A request does not take payment. Check-in keeps the confirmed bed. Check-out frees it. Only the owner can mark rent or a deposit received.
        </AppText>
        {loading ? (
          <View style={styles.skeleton} />
        ) : error ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            <AppText variant="body" style={styles.heading}>
              Your requests
            </AppText>
            {mine.length === 0 ? (
              <EmptyState title="No booking requests" message="Open a stay and choose Request a booking." />
            ) : (
              mine.map((request) => (
                <BookingCard
                  key={request.id}
                  request={request}
                  busy={stayIsBusy(request.id)}
                  onOpen={() => router.push(`/property/${request.propertyId}` as Href)}
                  onCancel={
                    request.status === 'requested' ? () => void changeStatus(request.id, 'cancelled', 'mine') : undefined
                  }
                  onCheckOut={request.status === 'checked_in' ? () => void checkOut(request.id, 'mine') : undefined}
                  rentCharges={charges.filter((charge) => charge.bookingRequestId === request.id)}
                  deposit={deposits.find((deposit) => deposit.bookingRequestId === request.id) ?? null}
                />
              ))
            )}
            {role === 'owner' ? (
              <>
                <AppText variant="body" style={styles.heading}>
                  Requests for your properties
                </AppText>
                {incoming.length === 0 ? (
                  <EmptyState title="No incoming requests" message="Booking requests from residents will appear here." />
                ) : (
                  incoming.map((request) => (
                    <BookingCard
                      key={request.id}
                      request={request}
                      busy={stayIsBusy(request.id)}
                      onOpen={() => router.push(`/property/${request.propertyId}` as Href)}
                      beds={
                        request.status === 'requested'
                          ? beds.filter((bed) => bed.propertyId === request.propertyId && !takenBedIds.includes(bed.id))
                          : []
                      }
                      onConfirmBed={(bedId) => void confirmRequest(request.id, bedId)}
                      onReject={
                        request.status === 'requested' ? () => void changeStatus(request.id, 'rejected', 'incoming') : undefined
                      }
                      onCheckIn={request.status === 'confirmed' ? () => void checkIn(request.id) : undefined}
                      onCheckOut={request.status === 'checked_in' ? () => void checkOut(request.id, 'incoming') : undefined}
                      onCancelConfirmation={
                        request.status === 'confirmed' ? () => void changeStatus(request.id, 'cancelled', 'incoming') : undefined
                      }
                      rentCharges={charges.filter((charge) => charge.bookingRequestId === request.id)}
                      onMarkReceived={(chargeId) => void markReceived(chargeId)}
                      deposit={deposits.find((deposit) => deposit.bookingRequestId === request.id) ?? null}
                      depositForm={depositRequestId === request.id}
                      depositAmount={depositAmount}
                      onDepositAmount={setDepositAmount}
                      onSaveDeposit={() => void saveDeposit(request.id)}
                      onMarkDepositReceived={(depositId) => void markDeposit(depositId)}
                      onRecordDeposit={
                        request.status === 'checked_in' && !deposits.some((deposit) => deposit.bookingRequestId === request.id)
                          ? () => {
                              setDepositRequestId(request.id);
                              setDepositAmount('');
                            }
                          : undefined
                      }
                      onRecordRent={
                        request.status === 'checked_in' &&
                        !charges.some(
                          (charge) =>
                            charge.bookingRequestId === request.id && charge.periodMonth.slice(0, 7) === currentRentMonth().slice(0, 7),
                        )
                          ? () => void recordRent(request.id)
                          : undefined
                      }
                    />
                  ))
                )}
              </>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function toBookingItems(
  rows: {
    id: string;
    status: string;
    property_id: string;
    bed_id?: string | null;
    beds?: unknown;
    properties: PropertyEmbed | PropertyEmbed[] | null;
  }[],
): BookingItem[] {
  return rows.flatMap((row) => {
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    if (!property || !isBookingStatus(row.status)) {
      return [];
    }
    return [
      {
        id: row.id,
        status: row.status,
        propertyId: row.property_id,
        bedId: row.bed_id ?? null,
        bedLabel: readBedLabel(row.beds),
        name: property.name,
        locality: property.locality,
        city: property.city,
      },
    ];
  });
}

function readBedLabel(value: unknown) {
  const bed = Array.isArray(value) ? value[0] : value;
  if (!bed || typeof bed !== 'object') {
    return null;
  }

  const label = 'label' in bed && typeof bed.label === 'string' ? bed.label : '';
  const rooms = 'rooms' in bed ? bed.rooms : null;
  const room = Array.isArray(rooms) ? rooms[0] : rooms;
  const roomName = room && typeof room === 'object' && 'name' in room && typeof room.name === 'string' ? room.name : '';
  if (roomName && label) {
    return `${roomName}, ${label}`;
  }
  return roomName || label || null;
}

function BookingCard({
  request,
  busy,
  beds = [],
  onOpen,
  onConfirmBed,
  onCheckIn,
  onCheckOut,
  onCancelConfirmation,
  onRecordRent,
  rentCharges = [],
  onMarkReceived,
  deposit = null,
  depositForm = false,
  depositAmount = '',
  onDepositAmount,
  onSaveDeposit,
  onRecordDeposit,
  onMarkDepositReceived,
  onReject,
  onCancel,
}: {
  request: BookingItem;
  busy: boolean;
  beds?: { id: string; roomName: string; label: string }[];
  onOpen: () => void;
  onConfirmBed?: (bedId: string) => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onCancelConfirmation?: () => void;
  onRecordRent?: () => void;
  rentCharges?: RentCharge[];
  onMarkReceived?: (chargeId: string) => void;
  deposit?: Deposit | null;
  depositForm?: boolean;
  depositAmount?: string;
  onDepositAmount?: (value: string) => void;
  onSaveDeposit?: () => void;
  onRecordDeposit?: () => void;
  onMarkDepositReceived?: (depositId: string) => void;
  onReject?: () => void;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.card}>
      <StatusBadge label={bookingStatusLabel[request.status]} />
      <AppText variant="body" style={styles.name}>
        {request.name}
      </AppText>
      <AppText variant="body">
        {request.locality}, {request.city}
      </AppText>
      {request.bedLabel ? <AppText variant="body">{request.bedLabel}</AppText> : null}
      {rentCharges.map((charge) => (
        <View key={charge.id} style={styles.rent}>
          <AppText variant="body">{rentChargeLabel(charge)}</AppText>
          {onMarkReceived && charge.status === 'due' ? (
            <AppButton
              label={busy ? 'Saving...' : 'Mark received'}
              disabled={busy}
              onPress={() => onMarkReceived(charge.id)}
            />
          ) : null}
        </View>
      ))}
      {deposit ? (
        <View style={styles.rent}>
          <AppText variant="body">{depositLabel(deposit)}</AppText>
          {onMarkDepositReceived && deposit.status === 'due' ? (
            <AppButton
              label={busy ? 'Saving...' : 'Mark deposit received'}
              disabled={busy}
              onPress={() => onMarkDepositReceived(deposit.id)}
            />
          ) : null}
        </View>
      ) : null}
      {depositForm && onDepositAmount && onSaveDeposit ? (
        <>
          <AppTextField label="Deposit amount" value={depositAmount} onChangeText={onDepositAmount} keyboardType="number-pad" />
          <AppButton label={busy ? 'Saving...' : 'Save deposit'} disabled={busy} onPress={onSaveDeposit} />
        </>
      ) : null}
      {request.status === 'confirmed' && !onCheckIn ? (
        <AppText variant="body">Waiting for the owner to check you in.</AppText>
      ) : null}
      <AppButton label="View stay" variant="secondary" onPress={onOpen} />
      {onConfirmBed && beds.length === 0 && request.status === 'requested' ? (
        <AppText variant="body">Add a room with beds in My properties before confirming.</AppText>
      ) : null}
      {onConfirmBed
        ? beds.map((bed) => (
            <AppButton
              key={bed.id}
              label={busy ? 'Saving...' : `Confirm ${bed.roomName}, ${bed.label}`}
              disabled={busy}
              onPress={() => onConfirmBed(bed.id)}
            />
          ))
        : null}
      {onCheckIn ? <AppButton label={busy ? 'Saving...' : 'Check in'} disabled={busy} onPress={onCheckIn} /> : null}
      {onCheckOut ? <AppButton label={busy ? 'Saving...' : 'Check out'} disabled={busy} onPress={onCheckOut} /> : null}
      {onRecordDeposit && !depositForm ? (
        <AppButton label="Record a deposit" variant="secondary" disabled={busy} onPress={onRecordDeposit} />
      ) : null}
      {onRecordRent ? (
        <AppButton label={busy ? 'Saving...' : "Record this month's rent"} disabled={busy} onPress={onRecordRent} />
      ) : null}
      {onCancelConfirmation ? (
        <AppButton label="Cancel confirmation" variant="secondary" disabled={busy} onPress={onCancelConfirmation} />
      ) : null}
      {onReject ? <AppButton label="Reject" variant="secondary" disabled={busy} onPress={onReject} /> : null}
      {onCancel ? <AppButton label="Cancel request" variant="secondary" disabled={busy} onPress={onCancel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  heading: {
    color: Brand.text,
    fontWeight: '800',
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
  rent: {
    width: '100%',
    gap: Spacing.two,
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
