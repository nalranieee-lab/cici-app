import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type DashboardSummary = {
  /** Jumlah incomes dengan expected_date di bulan berjalan. */
  incomeTotal: number;
  incomeCount: number;
  /** Jumlah obligations is_paid=false dengan due_date di bulan berjalan. */
  unpaidTotal: number;
  unpaidCount: number;
  /** Jumlah obligations is_paid=true dengan due_date di bulan berjalan. */
  paidTotal: number;
  paidCount: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Batas bulan berjalan (zona waktu perangkat): [awal, awal bulan berikutnya). */
function currentMonthRange() {
  const now = new Date();
  return {
    start: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

type ObligationRow = { amount: number; is_paid: boolean };
type IncomeRow = { amount: number };

const sum = (rows: { amount: number }[]) => rows.reduce((total, row) => total + Number(row.amount || 0), 0);

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
      setLoading(false);
      return;
    }
    const userId = userData.user.id;
    const { start, end } = currentMonthRange();
    const [obligationsRes, incomesRes] = await Promise.all([
      supabase.from("obligations").select("amount, is_paid").eq("user_id", userId).gte("due_date", start).lt("due_date", end),
      supabase.from("incomes").select("amount").eq("user_id", userId).gte("expected_date", start).lt("expected_date", end),
    ]);
    if (obligationsRes.error || incomesRes.error) {
      setError(`Gagal memuat ringkasan: ${(obligationsRes.error ?? incomesRes.error)!.message}`);
      setSummary(null);
    } else {
      const obligations = (obligationsRes.data ?? []) as ObligationRow[];
      const incomes = (incomesRes.data ?? []) as IncomeRow[];
      const unpaid = obligations.filter((row) => !row.is_paid);
      const paid = obligations.filter((row) => row.is_paid);
      setSummary({
        incomeTotal: sum(incomes),
        incomeCount: incomes.length,
        unpaidTotal: sum(unpaid),
        unpaidCount: unpaid.length,
        paidTotal: sum(paid),
        paidCount: paid.length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, loading, error, reload: load };
}
