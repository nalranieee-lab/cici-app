// filepath: src/lib/useFinancialData.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { FinancialSnapshot } from './financialTypes';

export function useFinancialData({ userId, startDate, endDate }: { userId: string | undefined; startDate: string; endDate: string }) {
  const request = useRef(0);
  const key = `${userId}:${startDate}:${endDate}`;
  const [state, setState] = useState<{ key: string; snapshot: FinancialSnapshot | null; loading: boolean; error: string | null }>({ key: '', snapshot: null, loading: !!userId, error: null });
  const reload = useCallback(async () => {
    const id = ++request.current;
    if (!userId) { setState({ key, snapshot: null, loading: false, error: null }); return; }
    setState({ key, snapshot: null, loading: true, error: null });
    try {
      const [profile, incomes, obligations] = await Promise.all([
        supabase.from('profiles').select('balance, balance_updated_at').eq('id', userId).maybeSingle(),
        supabase.from('incomes').select('id, name, amount, expected_date').eq('user_id', userId).gte('expected_date', startDate).lte('expected_date', endDate),
        supabase.from('obligations').select('id, name, amount, due_date, is_paid, paid_at').eq('user_id', userId),
      ]);
      const failure = profile.error ?? incomes.error ?? obligations.error;
      if (failure) throw new Error(failure.message);
      if (!profile.data) throw new Error('Profil akun belum tersedia. Lengkapi profil terlebih dahulu.');
      const snapshot: FinancialSnapshot = {
        userId,
        balance: profile.data.balance_updated_at ? Number(profile.data.balance) : null,
        balanceUpdatedAt: profile.data.balance_updated_at,
        incomes: (incomes.data ?? []).map(r => ({ id: r.id, name: r.name, amount: Number(r.amount), date: String(r.expected_date).slice(0, 10) })),
        obligations: (obligations.data ?? []).map(r => ({ id: r.id, name: r.name, amount: Number(r.amount), dueDate: String(r.due_date).slice(0, 10), isPaid: Boolean(r.is_paid), paidAt: r.paid_at ?? null })),
      };
      if (id === request.current) setState({ key, snapshot, loading: false, error: null });
    } catch (e) {
      if (id === request.current) setState({ key, snapshot: null, loading: false, error: e instanceof Error ? e.message : 'Data belum dapat dimuat. Coba lagi.' });
    }
  }, [userId, startDate, endDate, key]);
  useEffect(() => { void reload(); return () => { request.current++; }; }, [reload]);
  return { snapshot: state.key === key ? state.snapshot : null, loading: !!userId && (state.key !== key || state.loading), error: state.key === key ? state.error : null, reload };
}
