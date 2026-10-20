import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { AppTextField } from '@/components/ui/app-text-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { expenseCategories, expenseCategoryLabel, isExpenseCategory, type ExpenseCategory } from '@/constants/expenses';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { expenseAmountLabel, expenseDateLabel, recordExpense, type ExpenseItem } from '@/lib/expenses';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type OwnedProperty = {
  id: string;
  name: string;
};

export default function ExpensesScreen() {
  const { user, role } = useAuth();
  const [properties, setProperties] = useState<OwnedProperty[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>('repairs');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(role === 'owner');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(role === 'owner' ? '' : 'Only an owner can record expenses.');

  useFocusEffect(
    useCallback(() => {
      if (!supabase || !user || role !== 'owner') {
        return;
      }

      let active = true;
      void Promise.all([
        supabase.from('properties').select('id, name').order('name'),
        supabase.from('expenses').select('id, property_id, category, note, amount, spent_on, properties(name)').order('created_at', { ascending: false }),
      ]).then(([propertyResult, expenseResult]) => {
        if (!active) {
          return;
        }
        if (propertyResult.error || expenseResult.error) {
          setError(propertyResult.error?.message || expenseResult.error?.message || 'Expenses could not be loaded.');
          setLoading(false);
          return;
        }

        const nextProperties = (propertyResult.data ?? []).flatMap((row) =>
          typeof row.id === 'string' && typeof row.name === 'string' ? [{ id: row.id, name: row.name }] : [],
        );
        setProperties(nextProperties);
        setPropertyId((current) => (current && nextProperties.some((property) => property.id === current) ? current : nextProperties[0]?.id ?? null));
        setExpenses(
          (expenseResult.data ?? []).flatMap((row) => {
            const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
            if (
              typeof row.id !== 'string' ||
              typeof row.property_id !== 'string' ||
              typeof row.note !== 'string' ||
              typeof row.spent_on !== 'string' ||
              !isExpenseCategory(row.category) ||
              !property ||
              typeof property.name !== 'string'
            ) {
              return [];
            }
            return [
              {
                id: row.id,
                propertyId: row.property_id,
                propertyName: property.name,
                category: row.category,
                note: row.note,
                amount: row.amount,
                spentOn: row.spent_on,
              },
            ];
          }),
        );
        setError('');
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, [role, user]),
  );

  async function saveExpense() {
    if (saving || !propertyId) {
      return;
    }

    const propertyName = properties.find((property) => property.id === propertyId)?.name ?? '';
    setSaving(true);
    setError('');
    const result = await recordExpense(propertyId, category, note, amount, propertyName);
    setSaving(false);

    if (result.error || !result.expense) {
      setError(result.error || 'The expense could not be saved.');
      return;
    }

    setExpenses((current) => [result.expense as ExpenseItem, ...current]);
    setNote('');
    setAmount('');
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        <AppText variant="eyebrow">J3cluster</AppText>
        <AppText variant="title">Expenses</AppText>
        <AppText variant="body">Record money you spent on a property. Residents do not see this, and it does not take payment.</AppText>
        {role !== 'owner' ? (
          <AppText variant="body">Only an owner can record expenses.</AppText>
        ) : loading ? (
          <View style={styles.skeleton} />
        ) : error && properties.length === 0 && expenses.length === 0 ? (
          <AppText style={styles.error}>{error}</AppText>
        ) : (
          <>
            {properties.length === 0 ? (
              <EmptyState title="No properties yet" message="Add a property first, then come back to record an expense." />
            ) : (
              <>
                <AppText variant="body">Property</AppText>
                <View style={styles.choices}>
                  {properties.map((property) => (
                    <Pressable
                      key={property.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: propertyId === property.id }}
                      onPress={() => setPropertyId(property.id)}
                      style={[styles.choice, propertyId === property.id && styles.choiceSelected]}>
                      <AppText variant="body" style={propertyId === property.id ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {property.name}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <AppText variant="body">Type</AppText>
                <View style={styles.choices}>
                  {expenseCategories.map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === item.value }}
                      onPress={() => setCategory(item.value)}
                      style={[styles.choice, category === item.value && styles.choiceSelected]}>
                      <AppText variant="body" style={category === item.value ? styles.choiceSelectedLabel : styles.choiceLabel}>
                        {item.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <AppTextField label="What was it for?" value={note} onChangeText={setNote} autoCapitalize="sentences" />
                <AppTextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
                <AppButton label={saving ? 'Saving...' : 'Save expense'} disabled={saving} onPress={() => void saveExpense()} />
              </>
            )}
            {properties.length > 0 && expenses.length === 0 ? (
              <EmptyState title="No expenses yet" message="Saved expenses for your properties will appear here." />
            ) : expenses.length > 0 ? (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.card}>
                  <AppText variant="body" style={styles.name}>
                    {expenseCategoryLabel(expense.category)} · {expenseAmountLabel(expense.amount)}
                  </AppText>
                  <AppText variant="body">{expense.note}</AppText>
                  <AppText variant="body">
                    {expense.propertyName} · {expenseDateLabel(expense.spentOn)}
                  </AppText>
                </View>
              ))
            ) : null}
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
