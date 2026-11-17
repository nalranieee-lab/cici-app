// filepath: src/lib/useUpcomingObligations.ts
import { localFinance, useLocalFinance } from './localFinance';
export type UpcomingObligation = { id: string | number; name: string; amount: number; dueDate: string };
const reload = async () => { localFinance.refresh(); };
export function useUpcomingObligations() {
  const { data, error } = useLocalFinance();
  const items = data.obligations.filter(o => !o.is_paid).map(o => ({ id: o.id, name: o.name, amount: o.amount, dueDate: o.due_date })).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  return { items, loading: false, error: error ?? '', reload };
}
