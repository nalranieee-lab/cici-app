// filepath: src/lib/localFinance.ts
import { useSyncExternalStore } from 'react';
import { FinanceRepository, FINANCE_STORAGE_KEY } from './financeRepository';
import { createStarterFinance, mergeStarterFinance } from './starterFinance';
export const localFinance = new FinanceRepository({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }, { initialData: createStarterFinance, upgrade: mergeStarterFinance });
window.addEventListener('storage', event => { if (event.key === FINANCE_STORAGE_KEY || event.key === null) localFinance.refresh(); });
export function useLocalFinance() { return useSyncExternalStore(localFinance.subscribe, localFinance.getSnapshot); }
export const localError = (error: unknown) => error instanceof Error ? error.message : 'Perubahan belum dapat disimpan. Coba lagi.';
