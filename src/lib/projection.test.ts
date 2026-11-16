// filepath: src/lib/projection.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstallmentSchedule, computeProjection } from './projection.ts';
import type { FinancialSnapshot, InstallmentPlan } from './financialTypes.ts';

const snapshot: FinancialSnapshot = { userId: 'test', balance: 1000000, balanceUpdatedAt: '2026-11-16T00:00:00Z', incomes: [], obligations: [] };
const plan: InstallmentPlan = { name: 'Ponsel', price: 2000000, downPayment: 100000, purchaseDate: '2026-11-16', monthly: 200000, fees: 10000, tenor: 3, firstDueDate: '2026-11-30' };
const project = (s = snapshot, scenario?: InstallmentPlan) => computeProjection({ snapshot: s, startDate: '2026-11-16', endDate: '2027-01-31', scenario });

test('baseline tanpa transaksi mempertahankan saldo', () => { assert.equal(project().ending, 1000000); assert.equal(project().months.length, 3); });
test('uang muka sekali dan cicilan serta biaya untuk setiap tenor', () => { assert.equal(project(snapshot, plan).ending, 270000); assert.equal(buildInstallmentSchedule(plan).length, 4); });
test('jangkar tanggal 31 dipulihkan setelah Februari kabisat', () => {
  const events = buildInstallmentSchedule({ ...plan, downPayment: 0, purchaseDate: '2028-01-01', firstDueDate: '2028-01-31' });
  assert.deepEqual(events.map(e => e.date), ['2028-01-31', '2028-02-29', '2028-03-31']);
});
test('tenor mengubah jumlah pembayaran dan saldo horizon', () => { assert.equal(project(snapshot, { ...plan, tenor: 2 }).ending - project(snapshot, plan).ending, 210000); });
test('kewajiban lunas tidak dikurangi ulang, terlambat dikurangi hari ini', () => {
  const s = { ...snapshot, obligations: [{ id: 1, name: 'Lunas', amount: 500000, dueDate: '2026-11-10', isPaid: true, paidAt: '2026-11-11' }, { id: 2, name: 'Terlambat', amount: 200000, dueDate: '2026-11-15', isPaid: false, paidAt: null }] };
  assert.equal(project(s).daily[0].balance, 800000);
});
test('defisit dini terdeteksi meskipun saldo akhir positif', () => {
  const s = { ...snapshot, balance: 100, incomes: [{ id: 1, name: 'Gaji', amount: 1000, date: '2026-11-20' }], obligations: [{ id: 1, name: 'Tagihan', amount: 200, dueDate: '2026-11-17', isPaid: false, paidAt: null }] };
  const r = project(s); assert.equal(r.ending, 900); assert.equal(r.firstDeficit, '2026-11-17'); assert.equal(r.risk, 'Berisiko');
});
test('pemasukan lampau tidak diulang sebagai pemasukan bulanan', () => { assert.equal(project({ ...snapshot, incomes: [{ id: 1, name: 'Gaji', amount: 500000, date: '2026-11-01' }] }).ending, 1000000); });
test('pemasukan dan pembayaran pada hari sama dihitung bersih', () => {
  const s = { ...snapshot, balance: 0, incomes: [{ id: 1, name: 'Gaji', amount: 1000, date: '2026-11-16' }], obligations: [{ id: 1, name: 'Tagihan', amount: 500, dueDate: '2026-11-16', isPaid: false, paidAt: null }] };
  assert.equal(project(s).daily[0].balance, 500);
});
test('saldo belum diisi dan input tidak valid ditolak', () => {
  assert.throws(() => project({ ...snapshot, balance: null }));
  for (const patch of [{ tenor: 1.5 }, { monthly: NaN }, { downPayment: 3000000 }, { firstDueDate: '2026-02-31' }, { monthly: -1 }]) assert.throws(() => buildInstallmentSchedule({ ...plan, ...patch }));
});
test('rentang terbalik ditolak dan snapshot tidak dimutasi', () => {
  const before = JSON.stringify(snapshot); project(snapshot, plan); assert.equal(JSON.stringify(snapshot), before);
  assert.throws(() => computeProjection({ snapshot, startDate: '2027-02-01', endDate: '2026-11-16' }));
});
test('rentang proyeksi sangat jauh ditolak sebelum membuat kalender harian', () => {
  assert.throws(() => computeProjection({ snapshot, startDate: '2026-11-16', endDate: '2999-12-31' }));
});
