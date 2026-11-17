// filepath: src/lib/starterFinance.ts
import type { LocalFinance } from './financeRepository.ts';
import { demoWallets, demoTransactions } from './walletDemo.ts';

// Salinan data yang dibaca dari UI akun Vercel pada 17 November 2026.
// Tanggal dipertahankan; waktu transaksi dan ID server tidak tersedia dari UI.
export function createStarterFinance(): LocalFinance {
  const walletTransactions = demoTransactions.map(item => ({ ...item, description: item.description.replace(/ contoh/g, '') }));
  return {
    version: 1, starterVersion: 1,
    profile: { full_name: 'Nalranie', occupation: 'mahasiswa', balance: 8000000, balance_updated_at: '2026-11-17' },
    incomes: [
      { id: 'starter-income-uat', name: 'UAT CICI pemasukan 20261116', amount: 1000000, expected_date: '2026-11-16' },
      { id: 'starter-income-gaji', name: 'gaji', amount: 4200000, expected_date: '2026-11-25' },
      { id: 'starter-income-test', name: 'test-freelance', amount: 4000000, expected_date: '2026-11-27' },
      { id: 'starter-income-freelance', name: 'freelance', amount: 800000, expected_date: '2026-11-28' },
    ],
    obligations: [
      { id: 'starter-bill-hp', name: 'cicilan hp', amount: 500000, due_date: '2026-11-10', is_paid: true, paid_at: '2026-11-11', note: null, balance_deducted: false },
      { id: 'starter-bill-listrik', name: 'listrik', amount: 300000, due_date: '2026-11-15', is_paid: false, paid_at: null, note: null, balance_deducted: false },
      { id: 'starter-bill-uat', name: 'UAT CICI cicilan 20261116', amount: 300000, due_date: '2026-11-16', is_paid: false, paid_at: null, note: 'Data uji integrasi CICI', balance_deducted: false },
      { id: 'starter-bill-kos', name: 'sewa kos', amount: 800000, due_date: '2026-11-28', is_paid: false, paid_at: null, note: null, balance_deducted: false },
      { id: 'starter-bill-laptop', name: 'testing-cicilan laptop', amount: 3000000, due_date: '2026-12-05', is_paid: false, paid_at: null, note: null, balance_deducted: false },
    ],
    expenses: walletTransactions.filter(item => item.direction === 'out').map(item => ({ id: `starter-expense-${item.id}`, name: item.description, amount: item.amount, occurred_on: item.date, wallet_id: item.walletId, balance_deducted: false })),
    wallet: { balances: { dana: demoWallets[0].balance, gopay: demoWallets[1].balance, ovo: demoWallets[2].balance, shopeepay: demoWallets[3].balance }, payments: [] },
    walletTransactions,
  };
}

/** Tambahkan data awal sekali, pertahankan data dan nominal yang telah diedit pengguna. */
export function mergeStarterFinance(existing: LocalFinance): LocalFinance {
  const starter = createStarterFinance();
  if (existing.starterVersion === 1) return existing.expenses ? existing : { ...existing, expenses: starter.expenses, walletTransactions: existing.walletTransactions ?? starter.walletTransactions };
  const incomeSignature = (item: LocalFinance['incomes'][number]) => `${item.name}|${item.amount}|${item.expected_date}`;
  const billSignature = (item: LocalFinance['obligations'][number]) => `${item.name}|${item.amount}|${item.due_date}`;
  const walletIsEmpty = existing.wallet.payments.length === 0 && Object.values(existing.wallet.balances).every(amount => amount === 0);
  return {
    ...existing, starterVersion: 1,
    profile: {
      ...existing.profile,
      ...(existing.profile.balance_updated_at === null ? { balance: starter.profile.balance, balance_updated_at: starter.profile.balance_updated_at } : {}),
      ...(!existing.profile.full_name || existing.profile.full_name === 'Pengguna CICI' ? { full_name: starter.profile.full_name, occupation: existing.profile.occupation ?? starter.profile.occupation } : {}),
    },
    incomes: [...existing.incomes, ...starter.incomes.filter(item => !existing.incomes.some(row => row.id === item.id || incomeSignature(row) === incomeSignature(item)))],
    obligations: [...existing.obligations, ...starter.obligations.filter(item => !existing.obligations.some(row => row.id === item.id || billSignature(row) === billSignature(item)))],
    expenses: existing.expenses ?? starter.expenses,
    wallet: walletIsEmpty ? starter.wallet : existing.wallet,
    walletTransactions: existing.walletTransactions ?? starter.walletTransactions,
  };
}
