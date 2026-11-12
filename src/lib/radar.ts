// Radar risiko dan lencana pembayaran mendatang. Fungsi murni; tanggal berupa string "YYYY-MM-DD".
import { addDays } from "./cashflow";
import type { UpcomingObligation } from "./useUpcomingObligations";

/** Jendela radar: kewajiban belum dibayar yang jatuh tempo sampai sekian hari ke depan dari hari ini. */
export const RADAR_WINDOW_DAYS = 14;
/** Peringatan jika total kewajiban di jendela melebihi sekian persen saldo. */
export const RADAR_BALANCE_RATIO = 0.5;
/** Peringatan jika jumlah kewajiban di jendela sebanyak ini atau lebih. */
export const RADAR_COUNT_THRESHOLD = 3;
/** Lencana "Segera" untuk jatuh tempo dalam sekian hari ke depan. */
export const SOON_DAYS = 3;
/** Jumlah kewajiban di garis waktu radar. */
export const RADAR_TIMELINE_SIZE = 5;

export type DueBadge = { label: "Terlambat" | "Segera" | "Mendatang"; tone: "red" | "yellow" | "gray" };

export function dueBadge(dueDate: string, today: string): DueBadge {
  if (dueDate < today) return { label: "Terlambat", tone: "red" };
  if (dueDate <= addDays(today, SOON_DAYS)) return { label: "Segera", tone: "yellow" };
  return { label: "Mendatang", tone: "gray" };
}

export type RadarResult = {
  count: number;
  total: number;
  overdueCount: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  timeline: UpcomingObligation[];
  warn: boolean;
  reasons: string[];
};

/**
 * Jendela = semua kewajiban belum dibayar dengan due_date <= hari ini + RADAR_WINDOW_DAYS.
 * Yang sudah lewat jatuh tempo ikut dihitung karena masih harus dibayar dalam jendela ini.
 * balance = null berarti saldo belum pernah diisi; aturan persen saldo dilewati.
 */
export function computeRadar(input: { today: string; obligations: UpcomingObligation[]; balance: number | null }): RadarResult {
  const limit = addDays(input.today, RADAR_WINDOW_DAYS);
  const inWindow = input.obligations.filter((o) => o.dueDate <= limit).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const total = inWindow.reduce((sum, o) => sum + o.amount, 0);
  const overdueCount = inWindow.filter((o) => o.dueDate < input.today).length;
  const reasons: string[] = [];
  if (overdueCount > 0) reasons.push(`${overdueCount} kewajiban sudah lewat jatuh tempo`);
  if (inWindow.length >= RADAR_COUNT_THRESHOLD) reasons.push(`${inWindow.length} kewajiban menumpuk`);
  if (input.balance !== null && total > RADAR_BALANCE_RATIO * input.balance) reasons.push(`total melebihi ${Math.round(RADAR_BALANCE_RATIO * 100)}% saldo`);
  return {
    count: inWindow.length,
    total,
    overdueCount,
    rangeStart: inWindow[0]?.dueDate ?? null,
    rangeEnd: inWindow[inWindow.length - 1]?.dueDate ?? null,
    timeline: inWindow.slice(0, RADAR_TIMELINE_SIZE),
    warn: reasons.length > 0,
    reasons,
  };
}
