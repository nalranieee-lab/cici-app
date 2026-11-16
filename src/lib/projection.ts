// filepath: src/lib/projection.ts
import type { FinancialSnapshot, InstallmentPlan, ProjectionResult, ScheduledCashEvent } from './financialTypes.ts';

export const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function dateMs(date: string): number {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== date) throw new Error('Tanggal tidak valid.');
  return ms;
}
export function monthDate(date: string, offset: number): string {
  dateMs(date);
  const [y, m, day] = date.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + offset, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last))).toISOString().slice(0, 10);
}
export const monthEnd = (date: string) => { dateMs(date); const [y, m] = date.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
export const money = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
function validMoney(n: number) { return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000; }

export function buildInstallmentSchedule(plan: InstallmentPlan): ScheduledCashEvent[] {
  if (!plan.name.trim() || ![plan.price, plan.downPayment, plan.monthly, plan.fees].every(validMoney) || plan.price <= 0 || plan.monthly <= 0 || plan.downPayment > plan.price || !Number.isInteger(plan.tenor) || plan.tenor < 1 || plan.tenor > 120) throw new Error('Periksa nama, nominal rupiah, uang muka, dan tenor (1–120 bulan).');
  if (dateMs(plan.purchaseDate) > dateMs(plan.firstDueDate)) throw new Error('Jatuh tempo pertama tidak boleh sebelum tanggal uang muka.');
  const events: ScheduledCashEvent[] = plan.downPayment ? [{ date: plan.purchaseDate, amount: -plan.downPayment, label: `Uang muka ${plan.name}` }] : [];
  for (let i = 0; i < plan.tenor; i++) events.push({ date: monthDate(plan.firstDueDate, i), amount: -(plan.monthly + plan.fees), label: `${plan.name} (${i + 1}/${plan.tenor})` });
  return events;
}

export function computeProjection({ snapshot, startDate, endDate, scenario }: { snapshot: FinancialSnapshot; startDate: string; endDate: string; scenario?: InstallmentPlan }): ProjectionResult {
  const start = dateMs(startDate), end = dateMs(endDate);
  if (end < start || end > dateMs(monthEnd(monthDate(startDate, 120)))) throw new Error('Rentang proyeksi harus berurutan dan maksimal 120 bulan ke depan.');
  if (snapshot.balance === null || !Number.isFinite(snapshot.balance)) throw new Error('Isi saldo akun untuk melihat proyeksi.');
  const scheduled: ScheduledCashEvent[] = [];
  for (const i of snapshot.incomes) { dateMs(i.date); if (!validMoney(i.amount)) throw new Error('Nominal pemasukan tidak valid.'); if (i.date >= startDate) scheduled.push({ date: i.date, amount: i.amount, label: i.name }); }
  for (const o of snapshot.obligations) { dateMs(o.dueDate); if (!validMoney(o.amount)) throw new Error('Nominal kewajiban tidak valid.'); if (!o.isPaid) scheduled.push({ date: o.dueDate < startDate ? startDate : o.dueDate, amount: -o.amount, label: o.name }); }
  if (scenario) {
    if (scenario.purchaseDate < startDate) throw new Error('Tanggal uang muka harus hari ini atau setelahnya.');
    scheduled.push(...buildInstallmentSchedule(scenario));
  }
  const totals = new Map<string, number>();
  let outgoings = 0;
  for (const event of scheduled) if (event.date >= startDate && event.date <= endDate) { totals.set(event.date, (totals.get(event.date) ?? 0) + event.amount); if (event.amount < 0) outgoings -= event.amount; }
  let running = snapshot.balance;
  const daily: ProjectionResult['daily'] = [];
  const months: ProjectionResult['months'] = [];
  for (let ms = start; ms <= end; ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    running += totals.get(date) ?? 0;
    if (!Number.isSafeInteger(running)) throw new Error('Nominal proyeksi melebihi batas perhitungan.');
    daily.push({ date, balance: running });
    if (date === monthEnd(date) || ms === end) months.push({ month: date.slice(0, 7), closing: running });
  }
  const lowest = daily.reduce((min, d) => d.balance < min.balance ? d : min, daily[0]);
  return { daily, months, ending: running, lowest, firstDeficit: daily.find(d => d.balance < 0)?.date ?? null, risk: lowest.balance < 0 ? 'Berisiko' : lowest.balance < outgoings * 0.2 ? 'Waspada' : 'Terkendali' };
}
