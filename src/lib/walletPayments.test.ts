// filepath: src/lib/walletPayments.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoPaymentState, simulatePayment, invalidatePayment, reconcilePayments } from './walletPayments.ts';
const obligation = { id: 'bill-1', name: 'Cicilan uji', amount: 300000, isPaid: false, dueDate: '2026-12-01' };
test('pembayaran mengurangi saldo dompet dan mencatat kewajiban simulasi', () => {
  const start = createDemoPaymentState();
  const result = simulatePayment(start, { walletId: 'dana', obligation, at: '2026-11-16T10:00:00.000Z' });
  assert.equal(result.status, 'ok'); if (result.status !== 'ok') return;
  assert.equal(result.state.balances.dana, 300000);
  assert.equal(result.state.payments[0].obligationId, obligation.id);
  assert.equal(start.balances.dana, 600000);
});
test('saldo tidak cukup tidak mengubah state', () => {
  const state = createDemoPaymentState(); const result = simulatePayment(state, { walletId: 'ovo', obligation: { ...obligation, amount: 400000 }, at: '2026-11-16T10:00:00.000Z' });
  assert.equal(result.status, 'insufficient'); assert.equal(state.payments.length, 0);
});
test('satu kewajiban tidak dapat disimulasikan dua kali', () => {
  const start = createDemoPaymentState(); const first = simulatePayment(start, { walletId: 'dana', obligation, at: '2026-11-16T10:00:00.000Z' });
  assert.equal(first.status, 'ok'); if (first.status !== 'ok') return;
  assert.equal(simulatePayment(first.state, { walletId: 'gopay', obligation, at: '2026-11-16T10:00:00.000Z' }).status, 'already_simulated');
});
test('kewajiban lunas, nominal invalid dan dompet tak dikenal ditolak', () => {
  const state = createDemoPaymentState();
  for (const item of [{ ...obligation, isPaid: true }, { ...obligation, amount: 0 }, { ...obligation, amount: NaN }, { ...obligation, amount: 3.5 }]) assert.equal(simulatePayment(state, { walletId: 'dana', obligation: item, at: '2026-11-16T10:00:00.000Z' }).status, 'invalid');
  assert.equal(simulatePayment(state, { walletId: 'unknown' as never, obligation, at: 'invalid' }).status, 'invalid');
});
test('ID numerik dan string yang mewakili kewajiban sama tidak dapat dibayar dua kali', () => {
  const first = simulatePayment(createDemoPaymentState(), { walletId: 'dana', obligation: { ...obligation, id: 5 }, at: '2026-11-16T10:00:00.000Z' });
  assert.equal(first.status, 'ok'); if (first.status !== 'ok') return;
  assert.equal(simulatePayment(first.state, { walletId: 'gopay', obligation: { ...obligation, id: '5' }, at: '2026-11-16T10:00:00.000Z' }).status, 'already_simulated');
});
test('membatalkan hasil simulasi mengembalikan saldo yang sebelumnya digunakan sekali', () => {
  const first = simulatePayment(createDemoPaymentState(), { walletId: 'dana', obligation, at: '2026-11-16T10:00:00.000Z' });
  assert.equal(first.status, 'ok'); if (first.status !== 'ok') return;
  const undone = invalidatePayment(first.state, obligation.id);
  assert.equal(undone.balances.dana, 600000); assert.equal(undone.payments.length, 0);
  assert.equal(invalidatePayment(undone, obligation.id).balances.dana, 600000);
  assert.equal(simulatePayment(undone, { walletId: 'dana', obligation, at: '2026-11-16T10:00:00.000Z' }).status, 'ok');
});
test('perubahan nominal, nama, penghapusan, atau pembayaran aktual membatalkan simulasi usang', () => {
  const first = simulatePayment(createDemoPaymentState(), { walletId: 'dana', obligation, at: '2026-11-16T10:00:00.000Z' });
  assert.equal(first.status, 'ok'); if (first.status !== 'ok') return;
  for (const current of [[], [{ ...obligation, amount: 400000 }], [{ ...obligation, name: 'Nama baru' }], [{ ...obligation, dueDate: '2027-01-01' }], [{ ...obligation, isPaid: true }]]) {
    const next = reconcilePayments(first.state, current);
    assert.equal(next.balances.dana, 600000); assert.equal(next.payments.length, 0);
  }
  assert.equal(reconcilePayments(first.state, [obligation]), first.state);
});
