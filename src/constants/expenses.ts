export const expenseCategories = [
  { value: 'repairs', label: 'Repairs' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number]['value'];

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return expenseCategories.some((item) => item.value === value);
}

export function expenseCategoryLabel(value: string) {
  return expenseCategories.find((item) => item.value === value)?.label ?? value;
}
