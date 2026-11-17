// filepath: src/lib/reportSummary.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeReport, reportPeriods } from "./reportSummary.ts";
import { computeProjection, monthEnd } from "./projection.ts";
import type { FinancialSnapshot } from "./financialTypes.ts";
const snapshot: FinancialSnapshot = {
  userId: "test",
  balance: 0,
  balanceUpdatedAt: "2026-11-16",
  incomes: [
    { id: 1, name: "A", amount: 100, date: "2026-11-01" },
    { id: 2, name: "B", amount: 200, date: "2026-12-01" },
  ],
  obligations: [
    {
      id: 1,
      name: "Oktober",
      amount: 20,
      dueDate: "2026-10-31",
      isPaid: true,
      paidAt: "2026-11-01T10:00:00Z",
    },
    {
      id: 2,
      name: "November",
      amount: 30,
      dueDate: "2026-11-30",
      isPaid: false,
      paidAt: null,
    },
    {
      id: 3,
      name: "Tanpa tanggal",
      amount: 40,
      dueDate: "2026-11-05",
      isPaid: true,
      paidAt: null,
    },
  ],
  expenses: [
    { id: 'wallet-1', name: 'Makan', amount: 50, date: '2026-11-20', walletId: 'dana' },
    { id: 'wallet-old', name: 'Transportasi', amount: 10, date: '2026-10-31', walletId: 'gopay' },
  ],
};
test("ringkasan memakai batas periode dan tanggal pembayaran aktual", () => {
  const r = summarizeReport({
    snapshot,
    startDate: "2026-11-01",
    endDate: "2026-11-30",
  });
  assert.equal(r.plannedIncome, 100);
  assert.equal(r.paidExpenses, 20);
  assert.equal(r.walletExpenseTotal, 50);
  assert.equal(r.walletExpenses[0]?.walletId, 'dana');
  assert.equal(r.unpaidDue, 30);
  assert.equal(r.paidWithoutDate, 1);
});
test("ganti periode mengubah data dan tidak menganggap estimasi sebagai realisasi", () => {
  const r = summarizeReport({
    snapshot,
    startDate: "2026-12-01",
    endDate: "2026-12-31",
  });
  assert.equal(r.plannedIncome, 200);
  assert.equal(r.paidExpenses, 0);
  assert.equal(r.walletExpenseTotal, 0);
  assert.equal(r.unpaidDue, 0);
});
test("rentang terbalik ditolak", () =>
  assert.throws(() =>
    summarizeReport({
      snapshot,
      startDate: "2026-12-01",
      endDate: "2026-11-01",
    }),
  ));
test("seluruh pilihan periode mendatang dapat dihitung mesin proyeksi", () => {
  const today = "2026-11-16";
  for (const period of reportPeriods(today))
    if (period >= today.slice(0, 7))
      assert.doesNotThrow(() =>
        computeProjection({
          snapshot,
          startDate: today,
          endDate: monthEnd(`${period}-01`),
        }),
      );
});
