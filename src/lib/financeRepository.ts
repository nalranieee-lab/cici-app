// filepath: src/lib/financeRepository.ts
import { createDemoPaymentState, invalidatePayment, reconcilePayments, simulatePayment } from './walletPayments.ts';
import type { DemoPaymentState, DemoPaymentResult, DemoObligation } from './walletPayments.ts';
import type { WalletId } from './walletDemo.ts';
import type { DemoTransaction } from './walletDemo.ts';
import { dateMs } from './projection.ts';

export const FINANCE_STORAGE_KEY = 'cici.finance.v1';
export type LocalProfile = { full_name: string | null; occupation: string | null; balance: number; balance_updated_at: string | null };
export type LocalIncome = { id: string; name: string; amount: number; expected_date: string };
export type LocalObligation = { id: string; name: string; amount: number; due_date: string; is_paid: boolean; paid_at: string | null; note: string | null; balance_deducted: boolean };
export type LocalExpense = { id: string; name: string; amount: number; occurred_on: string; wallet_id: WalletId; balance_deducted: boolean };
export type LocalFinance = { version: 1; starterVersion?: number; profile: LocalProfile; incomes: LocalIncome[]; obligations: LocalObligation[]; expenses?: LocalExpense[]; wallet: DemoPaymentState; walletTransactions?: DemoTransaction[] };
type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type Snapshot = { data: LocalFinance; error: string | null };
const empty = (): LocalFinance => ({ version: 1, profile: { full_name: 'Pengguna CICI', occupation: null, balance: 0, balance_updated_at: null }, incomes: [], obligations: [], expenses: [], wallet: createDemoPaymentState() });
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const money = (value: unknown, signed = false): value is number => typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000_000 && (signed || value >= 0);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 1000;
const nullableText = (value: unknown) => value === null || text(value);
const date = (value: unknown) => { try { if (typeof value !== 'string') return false; dateMs(value); return true; } catch { return false; } };
const timestamp = (value: unknown) => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
export function validateFinance(value: unknown): asserts value is LocalFinance {
  if (!record(value) || value.version !== 1 || !record(value.profile) || !Array.isArray(value.incomes) || !Array.isArray(value.obligations) || !record(value.wallet)) throw new Error('Format penyimpanan CICI tidak dikenal.');
  const p = value.profile;
  if (value.starterVersion !== undefined && value.starterVersion !== 1) throw new Error('Versi data awal tidak valid.');
  const ids = new Set<string>();
  if (value.walletTransactions !== undefined) {
    if (!Array.isArray(value.walletTransactions)) throw new Error('Riwayat dompet tidak valid.');
    for (const item of value.walletTransactions) if (!record(item) || !text(item.id) || !text(item.description) || !date(item.date) || !money(item.amount) || !['in','out'].includes(String(item.direction)) || !['dana','gopay','ovo','shopeepay'].includes(String(item.walletId))) throw new Error('Riwayat dompet tidak valid.');
  }
  if (value.expenses !== undefined) {
    if (!Array.isArray(value.expenses)) throw new Error('Data pengeluaran tidak valid.');
    ids.clear();
    for (const expense of value.expenses) {
      if (!record(expense) || !text(expense.id) || ids.has(expense.id) || !text(expense.name) || !expense.name.trim() || !money(expense.amount) || expense.amount === 0 || !date(expense.occurred_on) || !['dana','gopay','ovo','shopeepay'].includes(String(expense.wallet_id)) || typeof expense.balance_deducted !== 'boolean') throw new Error('Data pengeluaran tidak valid.');
      ids.add(expense.id);
    }
  }
  if (!nullableText(p.full_name) || !nullableText(p.occupation) || !money(p.balance, true) || !timestamp(p.balance_updated_at)) throw new Error('Data profil tidak valid.');
  ids.clear();
  for (const i of value.incomes) {
    if (!record(i) || !text(i.id) || ids.has(i.id) || !text(i.name) || !i.name.trim() || !money(i.amount) || !date(i.expected_date)) throw new Error('Data pemasukan tidak valid.');
    ids.add(i.id);
  }
  ids.clear();
  for (const o of value.obligations) {
    if (!record(o) || !text(o.id) || ids.has(o.id) || !text(o.name) || !o.name.trim() || !money(o.amount) || !date(o.due_date) || typeof o.is_paid !== 'boolean' || !timestamp(o.paid_at) || !nullableText(o.note) || typeof o.balance_deducted !== 'boolean') throw new Error('Data kewajiban tidak valid.');
    ids.add(o.id);
  }
  const w = value.wallet;
  if (!record(w.balances) || !['dana','gopay','ovo','shopeepay'].every(id => money((w.balances as Record<string,unknown>)[id])) || !Array.isArray(w.payments)) throw new Error('Data dompet tidak valid.');
  ids.clear();
  for (const payment of w.payments) {
    if (!record(payment) || !text(payment.obligationId) || ids.has(payment.obligationId) || !text(payment.obligationName) || !money(payment.amount) || !date(payment.dueDate) || !text(payment.walletId) || !['dana','gopay','ovo','shopeepay'].includes(payment.walletId) || typeof payment.at !== 'string' || !timestamp(payment.at)) throw new Error('Data pembayaran dompet tidak valid.');
    ids.add(payment.obligationId);
  }
}
export class FinanceRepository {
  private snapshot: Snapshot = { data: empty(), error: null };
  private listeners = new Set<() => void>();
  private storage: Storage;
  private initialData: () => LocalFinance;
  private upgrade?: (data: LocalFinance) => LocalFinance;
  constructor(storage: Storage, options: { initialData?: () => LocalFinance; upgrade?: (data: LocalFinance) => LocalFinance } = {}) { this.storage = storage; this.initialData = options.initialData ?? empty; this.upgrade = options.upgrade; this.refresh(); }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() { this.listeners.forEach(listener => listener()); }
  refresh = () => {
    try {
      const raw = this.storage.getItem(FINANCE_STORAGE_KEY);
      const parsed: unknown = raw === null ? this.initialData() : JSON.parse(raw);
      validateFinance(parsed);
      const data = this.upgrade ? this.upgrade(parsed) : parsed;
      validateFinance(data);
      if (raw !== null && JSON.stringify(data) !== JSON.stringify(parsed)) this.storage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(data));
      if (JSON.stringify(data) === JSON.stringify(this.snapshot.data) && this.snapshot.error === null) return;
      this.snapshot = { data, error: null };
    } catch { this.snapshot = { ...this.snapshot, error: 'Data browser belum dapat dibaca. Periksa izin penyimpanan atau pulihkan data browser CICI sebelum menyimpan perubahan.' }; }
    this.emit();
  };
  update(change: (data: LocalFinance) => void) {
    this.refresh();
    if (this.snapshot.error) throw new Error(this.snapshot.error);
    const data = copy(this.snapshot.data);
    data.expenses ??= [];
    change(data);
    data.wallet = reconcilePayments(data.wallet, data.obligations.map(o => ({ ...o, dueDate: o.due_date, isPaid: o.is_paid })));
    validateFinance(data);
    try { this.storage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(data)); }
    catch { throw new Error('Perubahan belum tersimpan. Penyimpanan browser penuh atau tidak diizinkan.'); }
    this.snapshot = { data, error: null };
    this.emit();
  }
  saveProfile(fullName: string, occupation: string) { this.update(data => { if (!fullName.trim()) throw new Error('Nama wajib diisi.'); data.profile.full_name = fullName.trim(); data.profile.occupation = occupation.trim() || null; }); }
  saveBalance(balance: number) { this.update(data => { if (!money(balance)) throw new Error('Nominal saldo tidak valid.'); data.profile.balance = balance; data.profile.balance_updated_at = new Date().toISOString(); }); }
  saveIncome(input: Omit<LocalIncome, 'id'>, id?: string | number | null) {
    this.update(data => {
      if (id != null) { const existing = data.incomes.find(i => i.id === String(id)); if (!existing) throw new Error('Pemasukan tidak ditemukan.'); Object.assign(existing, input); }
      else data.incomes.push({ ...input, id: crypto.randomUUID() });
    });
  }
  removeIncome(id: string | number) { this.update(data => { data.incomes = data.incomes.filter(i => i.id !== String(id)); }); }
  saveObligation(input: Pick<LocalObligation, 'name' | 'amount' | 'due_date' | 'note'>, id?: string | number | null) {
    this.update(data => {
      if (id != null) { const existing = data.obligations.find(o => o.id === String(id)); if (!existing) throw new Error('Kewajiban tidak ditemukan.'); if (existing.is_paid && existing.amount !== input.amount) throw new Error('Batalkan pembayaran sebelum mengubah nominal kewajiban.'); Object.assign(existing, input); }
      else data.obligations.push({ ...input, id: crypto.randomUUID(), is_paid: false, paid_at: null, balance_deducted: false });
    });
  }
  removeObligation(id: string | number) { this.update(data => { data.obligations = data.obligations.filter(o => o.id !== String(id)); }); }
  saveExpense(input: Omit<LocalExpense, 'id' | 'balance_deducted'>, id?: string | null) {
    this.update(data => {
      const expenses = data.expenses ?? [];
      const existing = id ? expenses.find(item => item.id === id) : undefined;
      if (id && !existing) throw new Error('Pengeluaran tidak ditemukan.');
      if (existing?.balance_deducted) data.wallet.balances[existing.wallet_id] += existing.amount;
      const balanceDeducted = existing ? existing.balance_deducted : true;
      if (balanceDeducted && data.wallet.balances[input.wallet_id] < input.amount) throw new Error('Saldo e-wallet tidak cukup. Tambahkan saldo atau pilih dompet lain.');
      if (balanceDeducted) data.wallet.balances[input.wallet_id] -= input.amount;
      const expense: LocalExpense = { ...input, id: existing?.id ?? crypto.randomUUID(), balance_deducted: balanceDeducted };
      if (existing) Object.assign(existing, expense); else expenses.push(expense);
      data.expenses = expenses;
      const transactionId = `expense:${expense.id}`;
      const previousTransaction = existing && !existing.balance_deducted ? (data.walletTransactions ?? []).findIndex(item => item.direction === 'out' && item.walletId === existing.wallet_id && item.date === existing.occurred_on && item.description === existing.name && item.amount === existing.amount) : -1;
      if (previousTransaction >= 0) data.walletTransactions?.splice(previousTransaction, 1);
      data.walletTransactions = (data.walletTransactions ?? []).filter(item => item.id !== transactionId);
      data.walletTransactions.push({ id: transactionId, walletId: input.wallet_id, date: input.occurred_on, description: input.name, direction: 'out', amount: input.amount });
    });
  }
  removeExpense(id: string) {
    this.update(data => {
      const expense = (data.expenses ?? []).find(item => item.id === id);
      if (!expense) return;
      if (expense.balance_deducted) data.wallet.balances[expense.wallet_id] += expense.amount;
      data.expenses = (data.expenses ?? []).filter(item => item.id !== id);
      const previousTransaction = !expense.balance_deducted ? (data.walletTransactions ?? []).findIndex(item => item.direction === 'out' && item.walletId === expense.wallet_id && item.date === expense.occurred_on && item.description === expense.name && item.amount === expense.amount) : -1;
      if (previousTransaction >= 0) data.walletTransactions?.splice(previousTransaction, 1);
      data.walletTransactions = (data.walletTransactions ?? []).filter(item => item.id !== `expense:${id}`);
    });
  }
  pay(id: string | number) {
    let paidAt = '';
    this.update(data => {
      const item = data.obligations.find(o => o.id === String(id));
      if (!item) throw new Error('Kewajiban tidak ditemukan.');
      if (item.is_paid) throw new Error('Kewajiban sudah dibayar.');
      paidAt = new Date().toISOString();
      item.is_paid = true; item.paid_at = paidAt;
      item.balance_deducted = data.profile.balance_updated_at !== null;
      if (item.balance_deducted) { data.profile.balance -= item.amount; data.profile.balance_updated_at = paidAt; }
    });
    return paidAt;
  }
  cancelPayment(id: string | number) {
    this.update(data => {
      const item = data.obligations.find(o => o.id === String(id));
      if (!item?.is_paid) throw new Error('Pembayaran tidak ditemukan.');
      if (item.balance_deducted) { data.profile.balance += item.amount; data.profile.balance_updated_at = new Date().toISOString(); }
      item.is_paid = false; item.paid_at = null; item.balance_deducted = false;
    });
  }
  updateWalletBalance(walletId: WalletId, amount: number, mode: 'add' | 'set', source?: 'income' | 'transfer') {
    this.update(data => {
      if (!money(amount) || (mode === 'add' && amount === 0)) throw new Error('Isi nominal rupiah yang valid.');
      if (mode === 'add' && source !== 'income' && source !== 'transfer') throw new Error('Pilih sumber penambahan saldo.');
      if (mode === 'add' && source === 'transfer') {
        if (data.profile.balance_updated_at === null) throw new Error('Isi saldo utama di Dashboard terlebih dahulu.');
        if (data.profile.balance < amount) throw new Error('Saldo utama tidak cukup untuk dipindahkan.');
        data.profile.balance -= amount;
        data.profile.balance_updated_at = new Date().toISOString();
      }
      data.wallet.balances[walletId] = mode === 'add' ? data.wallet.balances[walletId] + amount : amount;
      if (mode === 'add') {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        (data.walletTransactions ??= []).push({ id: crypto.randomUUID(), walletId, date: today, description: source === 'transfer' ? 'Pemindahan dari saldo utama' : 'Pemasukan baru', direction: 'in', amount });
      }
      if (mode === 'add' && source === 'income') {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const walletName = { dana: 'DANA', gopay: 'GoPay', ovo: 'OVO', shopeepay: 'ShopeePay' }[walletId];
        data.incomes.push({ id: crypto.randomUUID(), name: `Pemasukan ${walletName}`, amount, expected_date: today });
      }
    });
  }
  simulateWalletPayment(walletId: WalletId, obligation: DemoObligation): DemoPaymentResult {
    let result: DemoPaymentResult = { status: 'invalid' };
    this.update(data => {
      const current = data.obligations.find(item => item.id === String(obligation.id));
      if (!current) return;
      result = simulatePayment(data.wallet, { walletId, obligation: { ...current, dueDate: current.due_date, isPaid: current.is_paid }, at: new Date().toISOString() });
      if (result.status === 'ok') data.wallet = result.state;
    });
    return result;
  }
  invalidateWallet(id: string | number) { this.update(data => { data.wallet = invalidatePayment(data.wallet, id); }); }
}
