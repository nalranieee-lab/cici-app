// filepath: src/lib/reportSummary.ts
import type { FinancialSnapshot } from "./financialTypes.ts";
import { monthDate } from "./projection.ts";
export const reportPeriods = (today: string) =>
  Array.from({ length: 127 }, (_, i) =>
    monthDate(`${today.slice(0, 7)}-01`, i - 6).slice(0, 7),
  );
import { dateMs } from "./projection.ts";
import { toDateString } from "./cashflow.ts";

export function summarizeReport({
  snapshot,
  startDate,
  endDate,
}: {
  snapshot: FinancialSnapshot;
  startDate: string;
  endDate: string;
}) {
  if (dateMs(startDate) > dateMs(endDate))
    throw new Error("Rentang laporan tidak valid.");
  const within = (date: string) => date >= startDate && date <= endDate;
  const plannedIncome = snapshot.incomes
    .filter((i) => within(i.date))
    .reduce((sum, i) => sum + i.amount, 0);
  const unpaidDue = snapshot.obligations
    .filter((o) => !o.isPaid && within(o.dueDate))
    .reduce((sum, o) => sum + o.amount, 0);
  const payments = snapshot.obligations
    .filter(
      (o) => o.isPaid && o.paidAt && Number.isFinite(Date.parse(o.paidAt)),
    )
    .map((o) => ({
      ...o,
      paidDate:
        o.paidAt!.length === 10 ? o.paidAt! : toDateString(new Date(o.paidAt!)),
    }))
    .filter((o) => within(o.paidDate));
  const paidExpenses = payments.reduce((sum, o) => sum + o.amount, 0);
  const walletExpenses = (snapshot.expenses ?? []).filter(e => within(e.date));
  const walletExpenseTotal = walletExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidWithoutDate = snapshot.obligations.filter(
    (o) => o.isPaid && (!o.paidAt || !Number.isFinite(Date.parse(o.paidAt))),
  ).length;
  return {
    plannedIncome,
    unpaidDue,
    paidExpenses,
    walletExpenseTotal,
    walletExpenses,
    paidCount: payments.length,
    paidWithoutDate,
    payments,
  };
}
