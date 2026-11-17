// filepath: src/lib/useDashboardSummary.ts
import { localFinance, useLocalFinance } from './localFinance';
import { toDateString } from './cashflow';
export type DashboardSummary = { incomeTotal: number; incomeCount: number; unpaidTotal: number; unpaidCount: number; paidTotal: number; paidCount: number; walletExpenseTotal: number; walletExpenseCount: number };
const reload = async () => { localFinance.refresh(); };
export function useDashboardSummary() {
  const { data, error } = useLocalFinance();
  const month = toDateString(new Date()).slice(0, 7);
  const incomes = data.incomes.filter(i => i.expected_date.startsWith(month));
  const unpaid = data.obligations.filter(o => !o.is_paid && o.due_date.startsWith(month));
  const paid = data.obligations.filter(o => o.is_paid && o.paid_at && toDateString(new Date(o.paid_at)).startsWith(month));
  const expenses = (data.expenses ?? []).filter(expense => expense.occurred_on.startsWith(month));
  const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
  return { summary: { incomeTotal: sum(incomes), incomeCount: incomes.length, unpaidTotal: sum(unpaid), unpaidCount: unpaid.length, paidTotal: sum(paid), paidCount: paid.length, walletExpenseTotal: sum(expenses), walletExpenseCount: expenses.length }, loading: false, error: error ?? '', reload };
}
