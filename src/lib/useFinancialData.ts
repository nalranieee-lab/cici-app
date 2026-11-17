// filepath: src/lib/useFinancialData.ts
import { useMemo } from 'react';
import { localFinance, useLocalFinance } from './localFinance';
import type { FinancialSnapshot } from './financialTypes';
const reload = async (_background = false) => { localFinance.refresh(); };
export function useFinancialData({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data, error } = useLocalFinance();
  const snapshot = useMemo<FinancialSnapshot>(() => ({
    userId: 'local-browser', balance: data.profile.balance_updated_at ? data.profile.balance : null,
    balanceUpdatedAt: data.profile.balance_updated_at,
    incomes: data.incomes.filter(i => i.expected_date >= startDate && i.expected_date <= endDate).map(i => ({ id: i.id, name: i.name, amount: i.amount, date: i.expected_date })),
    obligations: data.obligations.map(o => ({ id: o.id, name: o.name, amount: o.amount, dueDate: o.due_date, isPaid: o.is_paid, paidAt: o.paid_at })),
    expenses: (data.expenses ?? []).map(item => ({ id: item.id, name: item.name, amount: item.amount, date: item.occurred_on, walletId: item.wallet_id })),
  }), [data, startDate, endDate]);
  return { snapshot, loading: false, error, reload };
}
