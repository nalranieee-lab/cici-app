// filepath: src/lib/useCashflowData.ts
import { localFinance, useLocalFinance } from './localFinance';
import { toDateString } from './cashflow';
const reload = async () => { localFinance.refresh(); };
export function useCashflowData() {
  const { data, error } = useLocalFinance();
  const now = new Date(), today = toDateString(now), end = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  return { data: { incomes: data.incomes.filter(i => i.expected_date >= today).map(i => ({ amount: i.amount, date: i.expected_date })), obligations: data.obligations.filter(o => !o.is_paid && o.due_date < end).map(o => ({ amount: o.amount, dueDate: o.due_date, isPaid: o.is_paid })) }, error: error ?? '', loading: false, reload };
}
