// filepath: src/lib/financialViews.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { FinancialSnapshot, InstallmentPlan } from "./financialTypes.ts";
import {
  buildCalendarEvents,
  calculateDailyBudget,
  calendarMonthGrid,
} from "./financialViews.ts";

const snapshot: FinancialSnapshot = {
  userId: "fixture",
  balance: 1000000,
  balanceUpdatedAt: "2026-11-16T00:00:00Z",
  incomes: [{ id: 1, name: "Gaji", amount: 500000, date: "2026-11-20" }],
  obligations: [
    {
      id: 1,
      name: "Belum lunas",
      amount: 300000,
      dueDate: "2026-11-18",
      isPaid: false,
      paidAt: null,
    },
    {
      id: 2,
      name: "Lunas tanggal 19",
      amount: 100000,
      dueDate: "2026-11-15",
      isPaid: true,
      paidAt: "2026-11-19T02:00:00Z",
    },
    {
      id: 3,
      name: "Lunas tanpa tanggal",
      amount: 50000,
      dueDate: "2026-11-10",
      isPaid: true,
      paidAt: null,
    },
  ],
  expenses: [{id:'expense-1',name:'Makan',amount:30000,date:'2026-11-20',walletId:'dana'}],
};
const scenario: InstallmentPlan = {
  name: "Ponsel",
  price: 400000,
  downPayment: 100000,
  purchaseDate: "2026-11-16",
  monthly: 90000,
  fees: 10000,
  tenor: 3,
  firstDueDate: "2026-11-19",
};

test("kalender memakai tanggal pemasukan, jatuh tempo, tanggal pelunasan, dan skenario terpisah", () => {
  const events = buildCalendarEvents(snapshot, "2026-11", scenario);
  assert.deepEqual(
    events.filter((e) => e.kind === "income-scheduled").map((e) => e.date),
    ["2026-11-20"],
  );
  assert.deepEqual(
    events.filter((e) => e.kind === "obligation-due").map((e) => e.date),
    ["2026-11-18"],
  );
  assert.deepEqual(
    events.filter((e) => e.kind === "obligation-paid").map((e) => e.date),
    ["2026-11-19"],
  );
  assert.equal(events.filter((e) => e.kind === "scenario").length, 2);
  assert.equal(events.find(e => e.kind === 'expense-recorded')?.walletId, 'dana');
  assert.equal(events.find(e => e.kind === 'expense-recorded')?.amount, -30000);
  assert.equal(events.find(e => e.kind === 'expense-recorded')?.walletId, 'dana');
  assert.equal(events.find(e => e.kind === 'expense-recorded')?.amount, -30000);
  assert.equal(events.find(e => e.kind === 'expense-recorded')?.walletId, 'dana');
  assert.equal(events.find(e => e.kind === 'expense-recorded')?.amount, -30000);
  assert.equal(
    events.every((e) => e.kind !== "obligation-paid" || e.status === "actual"),
    true,
  );
});

test("pembayaran terjadwal dan simulasi demo wallet tidak menjadi pengeluaran aktual", () => {
  const events = buildCalendarEvents(snapshot, "2026-11");
  assert.equal(
    events.some((e) => e.title.includes("UAT CICI")),
    false,
  );
  assert.equal(
    events.some((e) => e.status === "simulated"),
    false,
  );
});

test('kalender mempertahankan identitas kewajiban meskipun nama sama', () => {
  const items = [{ ...snapshot.obligations[0], id: 'tag:1', name: 'Tagihan' }, { ...snapshot.obligations[0], id: 42, name: 'Tagihan' }];
  const due = buildCalendarEvents({ ...snapshot, incomes: [], obligations: items }, '2026-11');
  assert.deepEqual(new Set(due.filter(event => event.kind === 'obligation-due').map(event => event.obligationId)), new Set(['tag:1', 42]));
  assert.equal(buildCalendarEvents(snapshot, '2026-11').find(event => event.kind === 'obligation-paid')?.obligationId, 2);
  assert.equal(buildCalendarEvents(snapshot, '2026-11', scenario).filter(event => event.kind === 'scenario' || event.kind === 'income-scheduled').some(event => event.obligationId !== undefined), false);
});

test("budget memesan kewajiban jatuh tempo dan biaya skenario sebelum pemasukan berikutnya", () => {
  const result = calculateDailyBudget({
    snapshot,
    today: "2026-11-16",
    scenario,
  });
  assert.equal(result.nextIncomeDate, "2026-11-20");
  assert.equal(result.reservedObligations, 300000);
  assert.equal(result.reservedScenario, 200000);
  assert.equal(result.days, 4);
  assert.equal(result.amount, 125000);
});

test("budget tanpa pemasukan memakai akhir bulan dan menandai kekurangan dana", () => {
  const result = calculateDailyBudget({
    snapshot: { ...snapshot, balance: 100000, incomes: [] },
    today: "2026-11-16",
  });
  assert.equal(result.boundaryDate, "2026-12-01");
  assert.equal(result.insufficient, true);
  assert.equal(result.amount, 0);
  assert.equal(result.shortfall, 200000);
});

test("kewajiban pada hari pemasukan ikut dicadangkan karena urutan jam tidak diketahui", () => {
  const sameDay = {
    ...snapshot,
    obligations: [
      {
        id: 8,
        name: "Tagihan hari gajian",
        amount: 250000,
        dueDate: "2026-11-20",
        isPaid: false,
        paidAt: null,
      },
    ],
  };
  const result = calculateDailyBudget({
    snapshot: sameDay,
    today: "2026-11-16",
  });
  assert.equal(result.nextIncomeDate, "2026-11-20");
  assert.equal(result.reservedObligations, 250000);
  assert.equal(result.amount, 187500);
});

test("saldo kosong, tanggal salah, dan pengeluaran berulang tidak diasumsikan", () => {
  assert.throws(() =>
    calculateDailyBudget({
      snapshot: { ...snapshot, balance: null },
      today: "2026-11-16",
    }),
  );
  assert.throws(() => calculateDailyBudget({ snapshot, today: "2026-02-30" }));
  const noAutoRepeat = buildCalendarEvents(snapshot, "2026-12");
  assert.equal(
    noAutoRepeat.some((e) => e.title === "Gaji"),
    false,
  );
});

test("bulan kalender mengikuti jumlah hari pada bulan pendek dan kabisat melalui rentang event", () => {
  const leap = buildCalendarEvents(
    {
      ...snapshot,
      incomes: [{ id: 1, name: "Masuk 29", amount: 1, date: "2028-02-29" }],
    },
    "2028-02",
  );
  assert.equal(leap[0]?.date, "2028-02-29");
});
test("grid kalender membentuk jumlah sel tepat untuk bulan 28, 29, 30, dan 31 hari", () => {
  for (const [month, expectedDays] of [
    ["2026-02", 28],
    ["2028-02", 29],
    ["2026-04", 30],
    ["2026-08", 31],
  ] as const) {
    const cells = calendarMonthGrid(month);
    assert.equal(cells.length % 7, 0);
    assert.equal(cells.filter(Boolean).length, expectedDays);
    assert.equal(cells.filter(Boolean)[0], `${month}-01`);
    assert.equal(
      cells.filter(Boolean).at(-1),
      `${month}-${String(expectedDays).padStart(2, "0")}`,
    );
  }
});
