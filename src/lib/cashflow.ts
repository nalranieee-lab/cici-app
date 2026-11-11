// Perhitungan arus kas murni: tanpa akses jaringan, hanya fungsi dari input ke hasil.
// Semua tanggal berupa string "YYYY-MM-DD" (tanggal kalender perangkat, tanpa zona waktu).

/** Status "Waspada" jika saldo terendah di bawah 20% dari total kewajiban sisa bulan ini. */
export const WASPADA_RATIO = 0.2;

export type IncomeItem = { amount: number; date: string };
export type ObligationItem = { amount: number; dueDate: string; isPaid: boolean };
export type Risk = "Berisiko" | "Waspada" | "Terkendali";

export type DailyPoint = { date: string; balance: number; hasEvent: boolean };

export type CashflowResult = {
  today: string;
  endOfMonth: string;
  incomeRemaining: number;
  obligationsRemaining: number;
  projectedEnd: number;
  daily: DailyPoint[];
  lowest: { date: string; balance: number };
  risk: Risk;
  safe: {
    amount: number; // sudah dibulatkan ke bawah, minimal 0
    insufficient: boolean; // true jika (saldo - kebutuhan) negatif
    needs: number;
    days: number;
    boundaryDate: string; // tanggal pemasukan berikutnya, atau akhir bulan + 1 hari
    hasNextIncome: boolean;
  };
};

const DAY_MS = 86_400_000;
const toMs = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => fromMs(toMs(date) + days * DAY_MS);
const diffDays = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY_MS);

export const toDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Hari terakhir bulan dari tanggal yang diberikan. */
export function endOfMonthOf(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return fromMs(Date.UTC(y, m, 0)); // hari ke-0 bulan berikutnya = hari terakhir bulan ini
}

const total = (items: { amount: number }[]) => items.reduce((sum, item) => sum + item.amount, 0);

export function computeCashflow(input: {
  balance: number;
  today: string;
  incomes: IncomeItem[];
  obligations: ObligationItem[];
}): CashflowResult {
  const { balance, today } = input;
  const endOfMonth = endOfMonthOf(today);
  const unpaid = input.obligations.filter((o) => !o.isPaid);

  // 1) Ringkasan sisa bulan.
  const incomeRemaining = total(input.incomes.filter((i) => i.date >= today && i.date <= endOfMonth));
  const obligationsRemaining = total(unpaid.filter((o) => o.dueDate <= endOfMonth)); // termasuk yang sudah lewat
  const projectedEnd = balance + incomeRemaining - obligationsRemaining;

  // 2) Saldo harian dari hari ini sampai akhir bulan.
  const daily: DailyPoint[] = [];
  let running = balance;
  for (let date = today; date <= endOfMonth; date = addDays(date, 1)) {
    const isToday = date === today;
    const dayIncomes = input.incomes.filter((i) => i.date === date);
    // Hari ini juga mengurangkan kewajiban yang sudah lewat jatuh tempo.
    const dayObligations = unpaid.filter((o) => (isToday ? o.dueDate <= date : o.dueDate === date));
    running += total(dayIncomes) - total(dayObligations);
    daily.push({ date, balance: running, hasEvent: dayIncomes.length > 0 || dayObligations.length > 0 });
  }

  // 3) Status risiko dari saldo terendah.
  const lowest = daily.reduce((min, p) => (p.balance < min.balance ? p : min), daily[0]);
  const risk: Risk =
    lowest.balance < 0 ? "Berisiko" : lowest.balance < WASPADA_RATIO * obligationsRemaining ? "Waspada" : "Terkendali";

  // 4) Uang aman hari ini.
  const nextIncomeDate = input.incomes
    .map((i) => i.date)
    .filter((date) => date > today)
    .sort()[0];
  const boundaryDate = nextIncomeDate ?? addDays(endOfMonth, 1);
  const needs = total(unpaid.filter((o) => o.dueDate < boundaryDate));
  const days = Math.max(1, diffDays(today, boundaryDate));
  const perDay = (balance - needs) / days;
  const safe = {
    amount: perDay < 0 ? 0 : Math.floor(perDay),
    insufficient: perDay < 0,
    needs,
    days,
    boundaryDate,
    hasNextIncome: nextIncomeDate !== undefined,
  };

  return { today, endOfMonth, incomeRemaining, obligationsRemaining, projectedEnd, daily, lowest, risk, safe };
}
