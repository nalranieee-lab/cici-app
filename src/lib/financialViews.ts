// filepath: src/lib/financialViews.ts
import type {
  FinancialSnapshot,
  InstallmentPlan,
  ScheduledCashEvent,
} from "./financialTypes.ts";
import { addDays, toDateString } from "./cashflow.ts";
import { buildInstallmentSchedule, dateMs, monthEnd } from "./projection.ts";

export type CalendarEvent = {
  id: string;
  obligationId?: string | number;
  walletId?: string;
  date: string;
  title: string;
  amount: number;
  kind: "income-scheduled" | "obligation-due" | "obligation-paid" | "expense-recorded" | "scenario";
  status: "scheduled" | "actual" | "simulated";
};
export type DailyBudget = {
  amount: number;
  availableBeforeIncome: number;
  reservedObligations: number;
  reservedScenario: number;
  days: number;
  nextIncomeDate: string | null;
  boundaryDate: string;
  insufficient: boolean;
  shortfall: number;
};

function inMonth(date: string, month: string) {
  return date.startsWith(`${month}-`);
}
export function calendarMonthGrid(month: string): (string | null)[] {
  const first = `${month}-01`;
  dateMs(first);
  const [year, monthNumber] = month.split("-").map(Number);
  const offset = new Date(`${first}T12:00:00`).getDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const day = index - offset + 1;
    return day < 1 || day > days
      ? null
      : `${month}-${String(day).padStart(2, "0")}`;
  });
}

export function buildCalendarEvents(
  snapshot: FinancialSnapshot,
  month: string,
  scenario?: InstallmentPlan | null,
): CalendarEvent[] {
  dateMs(`${month}-01`);
  const events: CalendarEvent[] = [];
  for (const income of snapshot.incomes)
    if (inMonth(income.date, month))
      events.push({
        id: `income:${income.id}`,
        date: income.date,
        title: income.name,
        amount: income.amount,
        kind: "income-scheduled",
        status: "scheduled",
      });
  for (const obligation of snapshot.obligations) {
    if (!obligation.isPaid && inMonth(obligation.dueDate, month))
      events.push({
        id: `due:${obligation.id}`,
        obligationId: obligation.id,
        date: obligation.dueDate,
        title: obligation.name,
        amount: -obligation.amount,
        kind: "obligation-due",
        status: "scheduled",
      });
    if (
      obligation.isPaid &&
      obligation.paidAt &&
      Number.isFinite(Date.parse(obligation.paidAt))
    ) {
      const paidDate = toDateString(new Date(obligation.paidAt));
      if (inMonth(paidDate, month))
        events.push({
          id: `paid:${obligation.id}`,
          obligationId: obligation.id,
          date: paidDate,
          title: obligation.name,
          amount: -obligation.amount,
          kind: "obligation-paid",
          status: "actual",
        });
    }
  }
  for (const expense of snapshot.expenses ?? [])
    if (inMonth(expense.date, month))
      events.push({ id: `expense:${expense.id}`, date: expense.date, title: expense.name, amount: -expense.amount, kind: 'expense-recorded', status: 'actual', walletId: expense.walletId });
  if (scenario)
    for (const [index, event] of buildInstallmentSchedule(scenario).entries())
      if (inMonth(event.date, month))
        events.push({
          id: `scenario:${index}:${event.date}`,
          date: event.date,
          title: event.label,
          amount: event.amount,
          kind: "scenario",
          status: "simulated",
        });
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.kind.localeCompare(b.kind) ||
      a.id.localeCompare(b.id),
  );
}

export function calculateDailyBudget({
  snapshot,
  today,
  scenario,
}: {
  snapshot: FinancialSnapshot;
  today: string;
  scenario?: InstallmentPlan | null;
}): DailyBudget {
  dateMs(today);
  if (snapshot.balance === null || !Number.isSafeInteger(snapshot.balance))
    throw new Error("Isi saldo untuk menghitung anggaran harian.");
  const nextIncomeDate =
    snapshot.incomes
      .map((i) => {
        dateMs(i.date);
        return i.date;
      })
      .filter((d) => d > today)
      .sort()[0] ?? null;
  const boundaryDate = nextIncomeDate ?? addDays(monthEnd(today), 1);
  const days = Math.max(
    1,
    Math.round((dateMs(boundaryDate) - dateMs(today)) / 86400000),
  );
  // Include obligations due on payday too: the incoming funds and payment order may be unknown.
  const reservedObligations = snapshot.obligations
    .filter((o) => !o.isPaid && o.dueDate <= boundaryDate)
    .reduce((sum, o) => sum + o.amount, 0);
  let reservedScenario = 0;
  if (scenario) {
    if (scenario.purchaseDate < today)
      throw new Error("Tanggal skenario sudah lewat.");
    reservedScenario = buildInstallmentSchedule(scenario)
      .filter((e) => e.date >= today && e.date <= boundaryDate && e.amount < 0)
      .reduce((sum, e) => sum - e.amount, 0);
  }
  const availableBeforeIncome =
    snapshot.balance - reservedObligations - reservedScenario;
  return {
    amount: Math.max(0, Math.floor(availableBeforeIncome / days)),
    availableBeforeIncome,
    reservedObligations,
    reservedScenario,
    days,
    nextIncomeDate,
    boundaryDate,
    insufficient: availableBeforeIncome < 0,
    shortfall: Math.max(0, -availableBeforeIncome),
  };
}
